import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Deployment, DeploymentStatus, IDeploymentProgress } from '@fleetforge/core';
import { DeploymentRepository, DeviceDeploymentRepository } from '@fleetforge/database';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { DeploymentResponseDto } from './dto/deployment-response.dto';
import { DeviceDeploymentResponseDto, DeviceDeploymentStatsDto } from './dto/device-deployment.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DeploymentsService {
  constructor(
    private readonly deploymentRepository: DeploymentRepository,
    private readonly deviceDeploymentRepository: DeviceDeploymentRepository,
  ) {}

  async create(createDeploymentDto: CreateDeploymentDto): Promise<DeploymentResponseDto> {
    const initialProgress: IDeploymentProgress = {
      total: 0,
      pending: 0,
      inProgress: 0,
      succeeded: 0,
      failed: 0,
      rolledBack: 0,
    };

    const config = {
      ...createDeploymentDto.config,
      scheduledAt: createDeploymentDto.config.scheduledAt
        ? new Date(createDeploymentDto.config.scheduledAt)
        : undefined,
    };

    const deployment = new Deployment(
      uuidv4(),
      createDeploymentDto.firmwareId,
      createDeploymentDto.firmwareVersion,
      createDeploymentDto.name,
      DeploymentStatus.PENDING,
      config,
      initialProgress,
      createDeploymentDto.createdBy,
    );

    const saved = await this.deploymentRepository.create(deployment);
    return this.toResponseDto(saved);
  }

  async findAll(
    filter: { status?: DeploymentStatus; firmwareId?: string; createdBy?: string },
    limit = 100,
    offset = 0,
  ): Promise<DeploymentResponseDto[]> {
    const deployments = await this.deploymentRepository.findMany(filter, limit, offset);
    return deployments.map((d) => this.toResponseDto(d));
  }

  async findOne(id: string): Promise<DeploymentResponseDto> {
    const deployment = await this.deploymentRepository.findById(id);
    if (!deployment) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }
    return this.toResponseDto(deployment);
  }

  async findByFirmware(firmwareId: string): Promise<DeploymentResponseDto[]> {
    const deployments = await this.deploymentRepository.findMany({ firmwareId });
    return deployments.map((d) => this.toResponseDto(d));
  }

  async findActive(): Promise<DeploymentResponseDto[]> {
    const deployments = await this.deploymentRepository.findActive();
    return deployments.map((d) => this.toResponseDto(d));
  }

  async start(id: string): Promise<DeploymentResponseDto> {
    const deployment = await this.deploymentRepository.findById(id);
    if (!deployment) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }

    try {
      deployment.start();
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const updated = await this.deploymentRepository.update(id, {
      status: deployment.status,
      startedAt: deployment.startedAt,
    });
    return this.toResponseDto(updated);
  }

  async cancel(id: string): Promise<DeploymentResponseDto> {
    const deployment = await this.deploymentRepository.findById(id);
    if (!deployment) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }

    try {
      deployment.cancel();
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const updated = await this.deploymentRepository.update(id, {
      status: deployment.status,
      completedAt: deployment.completedAt,
    });
    return this.toResponseDto(updated);
  }

  async rollback(id: string, reason: string): Promise<DeploymentResponseDto> {
    const deployment = await this.deploymentRepository.findById(id);
    if (!deployment) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }

    try {
      deployment.rollback(reason);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const updated = await this.deploymentRepository.update(id, {
      status: deployment.status,
      completedAt: deployment.completedAt,
      errors: deployment.errors,
    });
    return this.toResponseDto(updated);
  }

  async updateProgress(id: string, progress: IDeploymentProgress): Promise<DeploymentResponseDto> {
    const deployment = await this.deploymentRepository.findById(id);
    if (!deployment) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }

    const updated = await this.deploymentRepository.update(id, { progress });
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const deployment = await this.deploymentRepository.findById(id);
    if (!deployment) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }
    await this.deploymentRepository.delete(id);
  }

  /**
   * Get device deployments for a deployment
   */
  async getDeviceDeployments(deploymentId: string): Promise<DeviceDeploymentResponseDto[]> {
    const deviceDeployments = await this.deviceDeploymentRepository.findByDeployment(deploymentId);
    return deviceDeployments.map((dd) => ({
      id: dd.id,
      deploymentId: dd.deploymentId,
      deviceId: dd.deviceId,
      firmwareId: dd.firmwareId,
      status: dd.status,
      previousFirmwareVersion: dd.previousFirmwareVersion ?? undefined,
      targetFirmwareVersion: dd.targetFirmwareVersion,
      progress: dd.progress,
      metrics: dd.metrics,
      errors: dd.errors,
      createdAt: dd.createdAt,
      updatedAt: dd.updatedAt,
      completedAt: dd.completedAt,
      rollbackReason: dd.rollbackReason,
    }));
  }

  /**
   * Get deployment statistics
   */
  async getDeploymentStats(deploymentId: string): Promise<DeviceDeploymentStatsDto> {
    return this.deviceDeploymentRepository.getStats(deploymentId);
  }

  /**
   * Map deployment entity to response DTO (public)
   */
  mapToResponse(deployment: Deployment): DeploymentResponseDto {
    return this.toResponseDto(deployment);
  }

  private toResponseDto(deployment: Deployment): DeploymentResponseDto {
    return {
      id: deployment.id,
      firmwareId: deployment.firmwareId,
      firmwareVersion: deployment.firmwareVersion,
      name: deployment.name,
      status: deployment.status,
      config: deployment.config,
      progress: deployment.progress,
      createdBy: deployment.createdBy,
      createdAt: deployment.createdAt,
      updatedAt: deployment.updatedAt,
      startedAt: deployment.startedAt,
      completedAt: deployment.completedAt,
      errors: deployment.errors,
      successRate: deployment.getSuccessRate(),
      durationMinutes: deployment.getDurationMinutes(),
      isScheduled: deployment.isScheduled(),
    };
  }
}
