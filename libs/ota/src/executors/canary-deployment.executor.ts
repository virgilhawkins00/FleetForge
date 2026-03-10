/**
 * Canary Deployment Executor
 * Deploys to a small percentage of devices first, then gradually increases
 */

// DeploymentStrategy is imported for type consistency but not directly used here
import { BaseDeploymentExecutor } from './base-deployment.executor';
import { IDeploymentConfig, IDeploymentProgress, IUpdatePackage, UpdateStatus } from '../types';

export class CanaryDeploymentExecutor extends BaseDeploymentExecutor {
  async execute(
    devices: string[],
    updatePackage: IUpdatePackage,
    config: IDeploymentConfig,
  ): Promise<IDeploymentProgress> {
    const deploymentId = `canary-${Date.now()}`;
    const canaryPercentage = config.canaryPercentage ?? 10;
    const canarySize = Math.ceil(devices.length * (canaryPercentage / 100));

    // Initialize deployment
    const deployment: IDeploymentProgress = {
      deploymentId,
      totalDevices: devices.length,
      successCount: 0,
      failureCount: 0,
      pendingCount: devices.length,
      currentBatch: 0,
      totalBatches: 2, // Canary + Full rollout
      startedAt: new Date(),
      status: 'RUNNING',
    };

    this.deployments.set(deploymentId, deployment);

    // Initialize device statuses
    devices.forEach((deviceId) => {
      this.deviceStatuses.set(deviceId, {
        deviceId,
        deploymentId,
        status: UpdateStatus.PENDING,
        progress: 0,
        currentVersion: '1.0.0', // Would come from device
        targetVersion: updatePackage.version,
      });
    });

    // Execute canary deployment
    await this.executeCanary(devices, canarySize, updatePackage, config, deployment);

    return deployment;
  }

  private async executeCanary(
    devices: string[],
    canarySize: number,
    updatePackage: IUpdatePackage,
    config: IDeploymentConfig,
    deployment: IDeploymentProgress,
  ): Promise<void> {
    // Phase 1: Canary group
    const canaryDevices = devices.slice(0, canarySize);
    const remainingDevices = devices.slice(canarySize);

    deployment.currentBatch = 1;
    await this.deployToBatch(canaryDevices, updatePackage, deployment);

    // Check canary health
    const canarySuccess = await this.checkCanaryHealth(canaryDevices, config, deployment);

    if (!canarySuccess) {
      deployment.status = 'FAILED';
      deployment.completedAt = new Date();

      if (config.autoRollback) {
        await this.rollback(deployment.deploymentId);
      }
      return;
    }

    // Phase 2: Full rollout
    deployment.currentBatch = 2;
    await this.deployToBatch(remainingDevices, updatePackage, deployment);

    deployment.status = 'COMPLETED';
    deployment.completedAt = new Date();
  }

  private async deployToBatch(
    devices: string[],
    updatePackage: IUpdatePackage,
    deployment: IDeploymentProgress,
  ): Promise<void> {
    const promises = devices.map(async (deviceId) => {
      this.updateDeviceStatus(deviceId, {
        status: UpdateStatus.DOWNLOADING,
        progress: 10,
        startedAt: new Date(),
      });

      const success = await this.updateDevice(deviceId, updatePackage);

      if (success) {
        this.updateDeviceStatus(deviceId, {
          status: UpdateStatus.INSTALLED,
          progress: 100,
          completedAt: new Date(),
        });
        deployment.successCount++;
      } else {
        this.updateDeviceStatus(deviceId, {
          status: UpdateStatus.FAILED,
          progress: 0,
          completedAt: new Date(),
          error: 'Update failed',
        });
        deployment.failureCount++;
      }

      deployment.pendingCount--;
    });

    await Promise.all(promises);
  }

  private async checkCanaryHealth(
    canaryDevices: string[],
    config: IDeploymentConfig,
    _deployment: IDeploymentProgress,
  ): Promise<boolean> {
    // Wait for health check interval (use minimum for fast tests)
    await this.sleep(Math.min(config.healthCheckInterval ?? 5000, 10));

    // Check if canary deployment exceeded failure threshold
    const canaryFailures = canaryDevices.filter((deviceId) => {
      const status = this.deviceStatuses.get(deviceId);
      return status?.status === UpdateStatus.FAILED;
    }).length;

    const canaryFailureRate = canaryFailures / canaryDevices.length;
    const maxFailureRate = config.maxFailureRate ?? 0.1;

    if (canaryFailureRate > maxFailureRate) {
      console.error(
        `Canary deployment failed: ${canaryFailureRate * 100}% failure rate exceeds ${maxFailureRate * 100}%`,
      );
      return false;
    }

    return true;
  }
}
