/**
 * Deployment Orchestrator Service
 * Core engine for orchestrating firmware deployments across device fleets
 * Supports advanced deployment strategies: Canary, Rolling, Phased
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  Deployment,
  DeploymentStatus,
  DeploymentStrategy,
  DeviceDeployment,
  DeviceDeploymentStatus,
  IDeploymentProgress,
  ICanaryConfig,
  IRollingConfig,
  IPhasedConfig,
  IDeploymentWave,
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
  strategyConfig?: ICanaryConfig | IRollingConfig | IPhasedConfig;
}

export interface IDeploymentBatch {
  batchNumber: number;
  deviceIds: string[];
  scheduledAt?: Date;
  isCanary?: boolean;
  waveName?: string;
  delayMinutes?: number;
  requireApproval?: boolean;
}

/** Deployment State for tracking phase/batch progress */
export interface IDeploymentState {
  currentBatch: number;
  totalBatches: number;
  currentWave?: string;
  canaryCompleted?: boolean;
  canarySuccessRate?: number;
  awaitingApproval?: boolean;
  pausedAt?: Date;
  lastHealthCheck?: Date;
  batchFailures: Map<number, number>;
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
   * Create deployment batches based on strategy with advanced configurations
   */
  private createBatches(deployment: Deployment, deviceIds: string[]): IDeploymentBatch[] {
    const { strategy, canary, rolling, phased } = deployment.config;
    // Legacy field support
    const legacyCanaryPct = deployment.config.canaryPercentage;
    const legacyPhaseCount = deployment.config.phaseCount;

    switch (strategy) {
      case DeploymentStrategy.IMMEDIATE:
        return [{ batchNumber: 1, deviceIds }];

      case DeploymentStrategy.CANARY:
        return this.createCanaryBatches(deviceIds, canary, legacyCanaryPct);

      case DeploymentStrategy.ROLLING:
        return this.createRollingBatches(deviceIds, rolling);

      case DeploymentStrategy.PHASED:
        return this.createPhasedBatches(deviceIds, phased, legacyPhaseCount);

      case DeploymentStrategy.BLUE_GREEN:
        // Blue-green: all devices in single batch (atomic switch)
        return [{ batchNumber: 1, deviceIds, waveName: 'Blue-Green Switch' }];

      default:
        return [{ batchNumber: 1, deviceIds }];
    }
  }

  /**
   * Create batches for Canary deployment strategy
   */
  private createCanaryBatches(
    deviceIds: string[],
    config?: ICanaryConfig,
    legacyPct?: number,
  ): IDeploymentBatch[] {
    const canaryPct = config?.percentage ?? legacyPct ?? 5;
    const canaryCount = Math.max(1, Math.ceil((deviceIds.length * canaryPct) / 100));
    const observationTime = config?.observationTimeMinutes ?? 30;

    return [
      {
        batchNumber: 1,
        deviceIds: deviceIds.slice(0, canaryCount),
        isCanary: true,
        waveName: 'Canary',
        delayMinutes: 0,
      },
      {
        batchNumber: 2,
        deviceIds: deviceIds.slice(canaryCount),
        waveName: 'Full Rollout',
        delayMinutes: observationTime,
        requireApproval: !(config?.autoPromote ?? true),
      },
    ];
  }

  /**
   * Create batches for Rolling deployment strategy
   */
  private createRollingBatches(deviceIds: string[], config?: IRollingConfig): IDeploymentBatch[] {
    let batchSize: number;

    if (config?.batchSize) {
      batchSize = config.batchSize;
    } else {
      const percentage = config?.batchPercentage ?? 10;
      batchSize = Math.max(1, Math.ceil((deviceIds.length * percentage) / 100));
    }

    const delayMinutes = config?.batchDelayMinutes ?? 5;
    const batches: IDeploymentBatch[] = [];
    let batchNum = 1;

    for (let i = 0; i < deviceIds.length; i += batchSize) {
      batches.push({
        batchNumber: batchNum,
        deviceIds: deviceIds.slice(i, i + batchSize),
        waveName: `Batch ${batchNum}`,
        delayMinutes: batchNum === 1 ? 0 : delayMinutes,
      });
      batchNum++;
    }

    return batches;
  }

  /**
   * Create batches for Phased/Wave deployment strategy
   */
  private createPhasedBatches(
    deviceIds: string[],
    config?: IPhasedConfig,
    legacyPhaseCount?: number,
  ): IDeploymentBatch[] {
    // Use custom waves if defined
    if (config?.waves?.length) {
      return this.createWaveBatches(deviceIds, config.waves);
    }

    // Otherwise use phaseCount for equal distribution
    const phases = config?.phaseCount ?? legacyPhaseCount ?? 5;
    const phaseDelay = config?.phaseDelayMinutes ?? 60;
    const requireApproval = config?.requireApproval ?? false;
    const batchSize = Math.ceil(deviceIds.length / phases);

    return Array.from({ length: phases }, (_, i) => ({
      batchNumber: i + 1,
      deviceIds: deviceIds.slice(i * batchSize, (i + 1) * batchSize),
      waveName: `Phase ${i + 1}`,
      delayMinutes: i === 0 ? 0 : phaseDelay,
      requireApproval: i > 0 ? requireApproval : false,
    }));
  }

  /**
   * Create batches from custom wave definitions
   */
  private createWaveBatches(deviceIds: string[], waves: IDeploymentWave[]): IDeploymentBatch[] {
    const batches: IDeploymentBatch[] = [];
    let remaining = [...deviceIds];
    let batchNum = 1;

    for (const wave of waves) {
      if (remaining.length === 0) break;

      const count = Math.ceil((remaining.length * wave.percentage) / 100);
      const waveDevices = remaining.slice(0, count);
      remaining = remaining.slice(count);

      batches.push({
        batchNumber: batchNum,
        deviceIds: waveDevices,
        waveName: wave.name,
        delayMinutes: wave.delayMinutes ?? 0,
        requireApproval: wave.requireApproval ?? false,
      });

      batchNum++;
    }

    // Add remaining devices to last batch if any
    if (remaining.length > 0 && batches.length > 0) {
      batches[batches.length - 1].deviceIds.push(...remaining);
    }

    return batches;
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

  /**
   * Get batch size based on deployment configuration (sync version)
   */
  private getBatchSize(_deploymentId: string): number {
    return 50; // Default batch size
  }

  /**
   * Check if canary phase is healthy and can be promoted
   */
  async checkCanaryHealth(deploymentId: string): Promise<{
    healthy: boolean;
    successRate: number;
    canPromote: boolean;
    reason?: string;
  }> {
    const deployment = await this.deploymentRepo.findById(deploymentId);
    if (!deployment) throw new NotFoundException(`Deployment ${deploymentId} not found`);

    const stats = await this.deviceDeploymentRepo.getStats(deploymentId);
    const canaryConfig = deployment.config.canary;
    const threshold = canaryConfig?.successThreshold ?? 95;

    // Calculate success rate for completed canary devices
    const completed = stats.succeeded + stats.failed;
    const successRate = completed > 0 ? (stats.succeeded / completed) * 100 : 0;

    const healthy = successRate >= threshold;
    const canPromote =
      healthy && (canaryConfig?.autoPromote ?? true) && stats.failed < stats.total * 0.05; // Less than 5% failures

    return {
      healthy,
      successRate,
      canPromote,
      reason: healthy
        ? 'Canary health check passed'
        : `Success rate ${successRate.toFixed(1)}% below threshold ${threshold}%`,
    };
  }

  /**
   * Promote canary deployment to full rollout
   */
  async promoteCanary(deploymentId: string): Promise<void> {
    const deployment = await this.deploymentRepo.findById(deploymentId);
    if (!deployment) throw new NotFoundException(`Deployment ${deploymentId} not found`);

    if (deployment.config.strategy !== DeploymentStrategy.CANARY) {
      throw new BadRequestException('Cannot promote non-canary deployment');
    }

    const health = await this.checkCanaryHealth(deploymentId);
    if (!health.healthy) {
      throw new BadRequestException(`Cannot promote: ${health.reason}`);
    }

    this.logger.log(`Promoting canary deployment ${deploymentId} to full rollout`);

    // Process remaining devices
    await this.processNextBatch(deploymentId);

    this.eventsGateway.broadcastDeploymentUpdate(deploymentId, {
      event: 'canary:promoted',
      successRate: health.successRate,
    });
  }

  /**
   * Pause deployment (useful for rolling/phased strategies)
   */
  async pauseDeployment(deploymentId: string): Promise<Deployment> {
    const deployment = await this.deploymentRepo.findById(deploymentId);
    if (!deployment) throw new NotFoundException(`Deployment ${deploymentId} not found`);

    if (deployment.status !== DeploymentStatus.IN_PROGRESS) {
      throw new BadRequestException('Can only pause in-progress deployments');
    }

    await this.deploymentRepo.update(deploymentId, {
      status: DeploymentStatus.PENDING, // Use PENDING as paused state
      updatedAt: new Date(),
    });

    this.logger.log(`Paused deployment ${deploymentId}`);
    this.eventsGateway.broadcastDeploymentUpdate(deploymentId, { event: 'deployment:paused' });

    return deployment;
  }

  /**
   * Resume a paused deployment
   */
  async resumeDeployment(deploymentId: string): Promise<Deployment> {
    const deployment = await this.deploymentRepo.findById(deploymentId);
    if (!deployment) throw new NotFoundException(`Deployment ${deploymentId} not found`);

    await this.deploymentRepo.update(deploymentId, {
      status: DeploymentStatus.IN_PROGRESS,
      updatedAt: new Date(),
    });

    // Continue processing
    await this.processNextBatch(deploymentId);

    this.logger.log(`Resumed deployment ${deploymentId}`);
    this.eventsGateway.broadcastDeploymentUpdate(deploymentId, { event: 'deployment:resumed' });

    return deployment;
  }

  /**
   * Advance to next phase (for phased deployments requiring approval)
   */
  async advancePhase(deploymentId: string): Promise<{ phase: number; devicesInPhase: number }> {
    const deployment = await this.deploymentRepo.findById(deploymentId);
    if (!deployment) throw new NotFoundException(`Deployment ${deploymentId} not found`);

    if (deployment.config.strategy !== DeploymentStrategy.PHASED) {
      throw new BadRequestException('advancePhase only applies to phased deployments');
    }

    const stats = await this.deviceDeploymentRepo.getStats(deploymentId);
    const phaseConfig = deployment.config.phased;
    const advanceThreshold = phaseConfig?.advanceThreshold ?? 90;

    // Check if current phase meets threshold
    const currentSuccessRate =
      stats.total > 0 ? (stats.succeeded / (stats.succeeded + stats.failed)) * 100 || 0 : 0;

    if (currentSuccessRate < advanceThreshold) {
      throw new BadRequestException(
        `Current phase success rate ${currentSuccessRate.toFixed(1)}% below threshold ${advanceThreshold}%`,
      );
    }

    // Process next batch
    await this.processNextBatch(deploymentId);

    const newStats = await this.deviceDeploymentRepo.getStats(deploymentId);
    const phase = Math.ceil(
      (newStats.total - newStats.pending) / (newStats.total / (phaseConfig?.phaseCount ?? 5)),
    );

    this.eventsGateway.broadcastDeploymentUpdate(deploymentId, {
      event: 'phase:advanced',
      phase,
    });

    return {
      phase,
      devicesInPhase: newStats.total - newStats.pending - stats.total + stats.pending,
    };
  }

  /**
   * Get detailed deployment status with strategy-specific info
   */
  async getDeploymentStatus(deploymentId: string): Promise<{
    deployment: Deployment;
    strategy: DeploymentStrategy;
    currentPhase?: number;
    totalPhases?: number;
    canaryHealth?: { healthy: boolean; successRate: number };
    awaitingApproval: boolean;
    estimatedCompletion?: Date;
  }> {
    const deployment = await this.deploymentRepo.findById(deploymentId);
    if (!deployment) throw new NotFoundException(`Deployment ${deploymentId} not found`);

    const stats = await this.deviceDeploymentRepo.getStats(deploymentId);
    const result: {
      deployment: Deployment;
      strategy: DeploymentStrategy;
      currentPhase?: number;
      totalPhases?: number;
      canaryHealth?: { healthy: boolean; successRate: number };
      awaitingApproval: boolean;
      estimatedCompletion?: Date;
    } = {
      deployment,
      strategy: deployment.config.strategy,
      awaitingApproval: false,
    };

    if (deployment.config.strategy === DeploymentStrategy.CANARY) {
      const health = await this.checkCanaryHealth(deploymentId);
      result.canaryHealth = { healthy: health.healthy, successRate: health.successRate };
      result.awaitingApproval =
        !(deployment.config.canary?.autoPromote ?? true) && health.healthy && stats.pending > 0;
    }

    if (deployment.config.strategy === DeploymentStrategy.PHASED) {
      const phaseCount = deployment.config.phased?.phaseCount ?? 5;
      const processed = stats.total - stats.pending;
      result.currentPhase = Math.ceil(processed / (stats.total / phaseCount)) || 1;
      result.totalPhases = phaseCount;
      result.awaitingApproval =
        (deployment.config.phased?.requireApproval ?? false) && stats.pending > 0;
    }

    return result;
  }
}
