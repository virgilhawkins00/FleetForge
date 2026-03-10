/**
 * Blue-Green Deployment Executor
 * Deploys to all devices simultaneously, then switches traffic
 */

import { BaseDeploymentExecutor } from './base-deployment.executor';
import { IDeploymentConfig, IDeploymentProgress, IUpdatePackage, UpdateStatus } from '../types';

export class BlueGreenDeploymentExecutor extends BaseDeploymentExecutor {
  async execute(
    devices: string[],
    updatePackage: IUpdatePackage,
    config: IDeploymentConfig,
  ): Promise<IDeploymentProgress> {
    const deploymentId = `blue-green-${Date.now()}`;

    // Initialize deployment
    const deployment: IDeploymentProgress = {
      deploymentId,
      totalDevices: devices.length,
      successCount: 0,
      failureCount: 0,
      pendingCount: devices.length,
      currentBatch: 0,
      totalBatches: 2, // Download + Activate
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
        currentVersion: '1.0.0',
        targetVersion: updatePackage.version,
      });
    });

    // Execute blue-green deployment
    await this.executeBlueGreen(devices, updatePackage, config, deployment);

    return deployment;
  }

  private async executeBlueGreen(
    devices: string[],
    updatePackage: IUpdatePackage,
    config: IDeploymentConfig,
    deployment: IDeploymentProgress,
  ): Promise<void> {
    // Phase 1: Download and prepare (Green environment)
    deployment.currentBatch = 1;
    await this.downloadToAllDevices(devices, updatePackage, deployment);

    // Check if all downloads succeeded
    const downloadFailures = devices.filter((deviceId) => {
      const status = this.deviceStatuses.get(deviceId);
      return status?.status === UpdateStatus.FAILED;
    }).length;

    if (downloadFailures > 0) {
      console.error(`Blue-Green deployment failed: ${downloadFailures} devices failed to download`);
      deployment.status = 'FAILED';
      deployment.completedAt = new Date();

      if (config.autoRollback) {
        await this.rollback(deployment.deploymentId);
      }
      return;
    }

    // Phase 2: Atomic switch (activate Green, deactivate Blue)
    deployment.currentBatch = 2;
    await this.activateNewVersion(devices, deployment);

    // Verify health after switch
    const healthCheckPassed = await this.verifyHealth(devices, config, deployment);

    if (!healthCheckPassed) {
      console.error('Blue-Green deployment failed: health check failed after switch');
      deployment.status = 'FAILED';

      if (config.autoRollback) {
        await this.rollback(deployment.deploymentId);
      }
      return;
    }

    deployment.status = 'COMPLETED';
    deployment.completedAt = new Date();
  }

  private async downloadToAllDevices(
    devices: string[],
    _updatePackage: IUpdatePackage,
    deployment: IDeploymentProgress,
  ): Promise<void> {
    const promises = devices.map(async (deviceId) => {
      this.updateDeviceStatus(deviceId, {
        status: UpdateStatus.DOWNLOADING,
        progress: 10,
        startedAt: new Date(),
      });

      // Simulate download
      await this.sleep(Math.random() * 10);

      this.updateDeviceStatus(deviceId, {
        status: UpdateStatus.DOWNLOADED,
        progress: 50,
      });

      // Simulate verification
      await this.sleep(5);

      const success = Math.random() > 0.05; // 95% success rate

      if (success) {
        this.updateDeviceStatus(deviceId, {
          status: UpdateStatus.DOWNLOADED,
          progress: 50,
        });
      } else {
        this.updateDeviceStatus(deviceId, {
          status: UpdateStatus.FAILED,
          progress: 0,
          error: 'Download failed',
        });
        deployment.failureCount++;
        deployment.pendingCount--;
      }
    });

    await Promise.all(promises);
  }

  private async activateNewVersion(
    devices: string[],
    deployment: IDeploymentProgress,
  ): Promise<void> {
    // Atomic switch - all devices activate simultaneously
    const promises = devices.map(async (deviceId) => {
      const status = this.deviceStatuses.get(deviceId);
      if (status?.status !== UpdateStatus.DOWNLOADED) {
        return;
      }

      this.updateDeviceStatus(deviceId, {
        status: UpdateStatus.INSTALLING,
        progress: 75,
      });

      // Simulate activation
      await this.sleep(5);

      this.updateDeviceStatus(deviceId, {
        status: UpdateStatus.INSTALLED,
        progress: 100,
        completedAt: new Date(),
      });

      deployment.successCount++;
      deployment.pendingCount--;
    });

    await Promise.all(promises);
  }

  private async verifyHealth(
    devices: string[],
    config: IDeploymentConfig,
    _deployment: IDeploymentProgress,
  ): Promise<boolean> {
    // Wait for health check interval (use minimum for fast tests)
    await this.sleep(Math.min(config.healthCheckInterval ?? 5000, 10));

    // Check device health
    const unhealthyDevices = devices.filter((deviceId) => {
      const status = this.deviceStatuses.get(deviceId);
      return status?.status === UpdateStatus.FAILED;
    }).length;

    const failureRate = unhealthyDevices / devices.length;
    const maxFailureRate = config.maxFailureRate ?? 0.05;

    return failureRate <= maxFailureRate;
  }
}
