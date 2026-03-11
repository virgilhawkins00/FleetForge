/**
 * Deployment Orchestrator Service
 * Core engine for orchestrating firmware deployments across device fleets
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  Deployment,
  DeploymentStatus,
  DeploymentStrategy,
  DeviceDeployment,
  DeviceDeploymentStatus,
  IDeploymentProgress,
} from '@fleetforge/core';
import {
  DeploymentRepository,
  DeviceDeploymentRepository,
  DeviceRepository,
  FirmwareRepository,
  FleetRepository,
  DeviceShadowRepository,
} from '@fleetforge/database';
import { v4 as uuidv4 } from 'uuid';
import { EventsGateway } from '../events/events.gateway';

export interface IDeploymentPlan {
  deploymentId: string;
  totalDevices: number;
  batches: IDeploymentBatch[];
  strategy: DeploymentStrategy;
}

export interface IDeploymentBatch {
  batchNumber: number;
  deviceIds: string[];
  scheduledAt?: Date;
  isCanary?: boolean;
}

@Injectable()
export class DeploymentOrchestratorService {
  private readonly logger = new Logger(DeploymentOrchestratorService.name);

  constructor(
    private readonly deploymentRepo: DeploymentRepository,
    private readonly deviceDeploymentRepo: DeviceDeploymentRepository,
    private readonly deviceRepo: DeviceRepository,
    private readonly firmwareRepo: FirmwareRepository,
    private readonly fleetRepo: FleetRepository,
    private readonly shadowRepo: DeviceShadowRepository,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Create deployment plan and initialize device deployments
   */
  async createDeploymentPlan(deploymentId: string): Promise<IDeploymentPlan> {
    const deployment = await this.deploymentRepo.findById(deploymentId);
    if (!deployment) throw new NotFoundException(`Deployment ${deploymentId} not found`);

    const firmware = await this.firmwareRepo.findById(deployment.firmwareId);
    if (!firmware) throw new NotFoundException(`Firmware ${deployment.firmwareId} not found`);

    // Resolve target devices
    const deviceIds = await this.resolveTargetDevices(deployment);
    if (deviceIds.length === 0) {
      throw new BadRequestException('No eligible devices found for deployment');
    }

    // Create batches based on strategy
    const batches = this.createBatches(deployment, deviceIds);

    // Create device deployment records
    await this.initializeDeviceDeployments(deployment, deviceIds, firmware.version);

    // Update deployment with total count
    const progress: IDeploymentProgress = {
      total: deviceIds.length,
      pending: deviceIds.length,
      inProgress: 0,
      succeeded: 0,
      failed: 0,
      rolledBack: 0,
    };
    await this.deploymentRepo.update(deploymentId, { progress });

    this.logger.log(`Created deployment plan for ${deploymentId}: ${deviceIds.length} devices`);

    return {
      deploymentId,
      totalDevices: deviceIds.length,
      batches,
      strategy: deployment.config.strategy,
    };
  }

  /**
   * Start executing a deployment
   */
  async startDeployment(deploymentId: string): Promise<Deployment> {
    const deployment = await this.deploymentRepo.findById(deploymentId);
    if (!deployment) throw new NotFoundException(`Deployment ${deploymentId} not found`);

    if (deployment.status !== DeploymentStatus.PENDING) {
      throw new BadRequestException(`Cannot start deployment with status: ${deployment.status}`);
    }

    // Start the deployment
    deployment.start();
    await this.deploymentRepo.update(deploymentId, {
      status: deployment.status,
      startedAt: deployment.startedAt,
    });

    // Start first batch
    await this.processNextBatch(deploymentId);

    this.eventsGateway.broadcastDeploymentUpdate(deploymentId, {
      status: deployment.status,
      startedAt: deployment.startedAt,
    });

    return deployment;
  }

  /**
   * Process next batch of devices for deployment
   */
  async processNextBatch(deploymentId: string): Promise<void> {
    const pendingDevices = await this.deviceDeploymentRepo.findMany(
      { deploymentId, status: DeviceDeploymentStatus.PENDING },
      this.getBatchSize(deploymentId),
    );

    if (pendingDevices.length === 0) {
      this.logger.log(`No more pending devices for deployment ${deploymentId}`);
      return;
    }

    // Start deployment on each device
    for (const dd of pendingDevices) {
      await this.startDeviceDeployment(dd);
    }

    // Update progress
    await this.updateDeploymentProgress(deploymentId);
  }

  /**
   * Handle device deployment progress update
   */
  async updateDeviceProgress(
    deploymentId: string,
    deviceId: string,
    update: {
      status?: DeviceDeploymentStatus;
      progress?: number;
      error?: { code: string; message: string; retryable: boolean };
    },
  ): Promise<void> {
    const dd = await this.deviceDeploymentRepo.findByDeploymentAndDevice(deploymentId, deviceId);
    if (!dd) return;

    if (update.status) {
      dd.status = update.status;
      if (update.status === DeviceDeploymentStatus.SUCCEEDED) {
        dd.succeed();
      } else if (update.status === DeviceDeploymentStatus.FAILED && update.error) {
        dd.fail({ ...update.error, timestamp: new Date() });
      }
    }
    if (update.progress !== undefined) dd.progress = update.progress;

    await this.deviceDeploymentRepo.update(dd.id, {
      status: dd.status,
      progress: dd.progress,
      errors: dd.errors,
      completedAt: dd.completedAt,
    });

    await this.updateDeploymentProgress(deploymentId);
    await this.checkAutoRollback(deploymentId);
  }

  /**
   * Update overall deployment progress from device deployments
   */
  private async updateDeploymentProgress(deploymentId: string): Promise<void> {
    const stats = await this.deviceDeploymentRepo.getStats(deploymentId);

    const progress: IDeploymentProgress = {
      total: stats.total,
      pending: stats.pending,
      inProgress: stats.downloading + stats.downloaded + stats.installing + stats.rebooting,
      succeeded: stats.succeeded,
      failed: stats.failed,
      rolledBack: stats.rolledBack,
    };

    await this.deploymentRepo.update(deploymentId, { progress });

    // Check if deployment is complete
    if (progress.pending === 0 && progress.inProgress === 0) {
      const deployment = await this.deploymentRepo.findById(deploymentId);
      if (deployment && deployment.status === DeploymentStatus.IN_PROGRESS) {
        deployment.complete();
        await this.deploymentRepo.update(deploymentId, {
          status: deployment.status,
          completedAt: deployment.completedAt,
        });
        this.eventsGateway.broadcastDeploymentUpdate(deploymentId, {
          status: deployment.status,
          completedAt: deployment.completedAt,
          progress,
        });
      }
    }
  }

  /**
   * Check and perform auto-rollback if threshold exceeded
   */
  private async checkAutoRollback(deploymentId: string): Promise<void> {
    const deployment = await this.deploymentRepo.findById(deploymentId);
    if (!deployment || deployment.status !== DeploymentStatus.IN_PROGRESS) return;

    if (deployment.shouldAutoRollback()) {
      await this.rollbackDeployment(deploymentId, 'Auto-rollback: failure threshold exceeded');
    }
  }

  /**
   * Rollback a deployment
   */
  async rollbackDeployment(deploymentId: string, reason: string): Promise<Deployment> {
    const deployment = await this.deploymentRepo.findById(deploymentId);
    if (!deployment) throw new NotFoundException(`Deployment ${deploymentId} not found`);

    deployment.rollback(reason);
    await this.deploymentRepo.update(deploymentId, {
      status: deployment.status,
      completedAt: deployment.completedAt,
      errors: deployment.errors,
    });

    // Rollback all in-progress and pending device deployments
    const activeDevices = await this.deviceDeploymentRepo.findMany({
      deploymentId,
      status: [
        DeviceDeploymentStatus.PENDING,
        DeviceDeploymentStatus.DOWNLOADING,
        DeviceDeploymentStatus.DOWNLOADED,
        DeviceDeploymentStatus.INSTALLING,
      ],
    });

    for (const dd of activeDevices) {
      dd.rollback(reason);
      await this.deviceDeploymentRepo.update(dd.id, {
        status: dd.status,
        rollbackReason: dd.rollbackReason,
        completedAt: dd.completedAt,
      });

      // Send rollback command via shadow
      if (dd.previousFirmwareVersion) {
        await this.shadowRepo.updateDesired(dd.deviceId, {
          deployment: {
            command: 'ROLLBACK',
            targetVersion: dd.previousFirmwareVersion,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    this.eventsGateway.broadcastDeploymentUpdate(deploymentId, {
      status: deployment.status,
      rollbackReason: reason,
    });

    this.logger.warn(`Rolled back deployment ${deploymentId}: ${reason}`);
    return deployment;
  }

  /**
   * Resolve target devices from deployment config
   */
  private async resolveTargetDevices(deployment: Deployment): Promise<string[]> {
    const target = deployment.config.target;
    const deviceIds = new Set<string>();

    // Direct device IDs
    if (target.deviceIds?.length) {
      target.deviceIds.forEach((id) => deviceIds.add(id));
    }

    // Fleet IDs
    if (target.fleetIds?.length) {
      for (const fleetId of target.fleetIds) {
        const fleet = await this.fleetRepo.findById(fleetId);
        if (fleet) {
          fleet.deviceIds.forEach((id) => deviceIds.add(id));
        }
      }
    }

    // Tags
    if (target.tags?.length) {
      const devices = await this.deviceRepo.findByTags(target.tags);
      devices.forEach((d) => deviceIds.add(d.id));
    }

    // Apply percentage filter
    if (target.percentage && target.percentage < 100) {
      const allIds = Array.from(deviceIds);
      const count = Math.ceil((allIds.length * target.percentage) / 100);
      return allIds.slice(0, count);
    }

    return Array.from(deviceIds);
  }

  /**
   * Create deployment batches based on strategy
   */
  private createBatches(deployment: Deployment, deviceIds: string[]): IDeploymentBatch[] {
    const { strategy, canaryPercentage, phaseCount } = deployment.config;

    switch (strategy) {
      case DeploymentStrategy.IMMEDIATE:
        return [{ batchNumber: 1, deviceIds }];

      case DeploymentStrategy.CANARY: {
        const canaryCount = Math.ceil((deviceIds.length * (canaryPercentage ?? 5)) / 100);
        return [
          { batchNumber: 1, deviceIds: deviceIds.slice(0, canaryCount), isCanary: true },
          { batchNumber: 2, deviceIds: deviceIds.slice(canaryCount) },
        ];
      }

      case DeploymentStrategy.ROLLING:
      case DeploymentStrategy.PHASED: {
        const phases = phaseCount ?? 5;
        const batchSize = Math.ceil(deviceIds.length / phases);
        return Array.from({ length: phases }, (_, i) => ({
          batchNumber: i + 1,
          deviceIds: deviceIds.slice(i * batchSize, (i + 1) * batchSize),
        }));
      }

      default:
        return [{ batchNumber: 1, deviceIds }];
    }
  }

  /**
   * Initialize device deployment records
   */
  private async initializeDeviceDeployments(
    deployment: Deployment,
    deviceIds: string[],
    targetVersion: string,
  ): Promise<void> {
    const entities: DeviceDeployment[] = [];

    for (const deviceId of deviceIds) {
      const device = await this.deviceRepo.findById(deviceId);
      entities.push(
        new DeviceDeployment(
          uuidv4(),
          deployment.id,
          deviceId,
          deployment.firmwareId,
          DeviceDeploymentStatus.PENDING,
          device?.firmwareVersion ?? null,
          targetVersion,
          0,
          { downloadRetries: 0, installRetries: 0 },
          [],
        ),
      );
    }

    await this.deviceDeploymentRepo.createMany(entities);
  }

  /**
   * Start deployment on a single device
   */
  private async startDeviceDeployment(dd: DeviceDeployment): Promise<void> {
    dd.startDownload();
    await this.deviceDeploymentRepo.update(dd.id, {
      status: dd.status,
      progress: dd.progress,
      metrics: dd.metrics,
    });

    // Update device shadow with deployment command
    await this.shadowRepo.updateDesired(dd.deviceId, {
      deployment: {
        id: dd.deploymentId,
        firmwareId: dd.firmwareId,
        targetVersion: dd.targetFirmwareVersion,
        command: 'START_DOWNLOAD',
        timestamp: new Date().toISOString(),
      },
    });

    this.eventsGateway.sendToDevice(dd.deviceId, 'deployment:start', {
      deploymentId: dd.deploymentId,
      firmwareId: dd.firmwareId,
      targetVersion: dd.targetFirmwareVersion,
    });
  }

  private getBatchSize(_deploymentId: string): number {
    return 50; // Default batch size
  }
}
