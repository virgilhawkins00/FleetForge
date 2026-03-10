/**
 * Rolling Deployment Executor
 * Deploys in batches with configurable size and delay
 */

import { BaseDeploymentExecutor } from './base-deployment.executor';
import { IDeploymentConfig, IDeploymentProgress, IUpdatePackage, UpdateStatus } from '../types';

export class RollingDeploymentExecutor extends BaseDeploymentExecutor {
  async execute(
    devices: string[],
    updatePackage: IUpdatePackage,
    config: IDeploymentConfig,
  ): Promise<IDeploymentProgress> {
    const deploymentId = `rolling-${Date.now()}`;
    const batchSize = config.batchSize ?? Math.ceil(devices.length / 10);
    const batches = this.createBatches(devices, batchSize);

    // Initialize deployment
    const deployment: IDeploymentProgress = {
      deploymentId,
      totalDevices: devices.length,
      successCount: 0,
      failureCount: 0,
      pendingCount: devices.length,
      currentBatch: 0,
      totalBatches: batches.length,
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

    // Execute rolling deployment
    await this.executeRolling(batches, updatePackage, config, deployment);

    return deployment;
  }

  private async executeRolling(
    batches: string[][],
    updatePackage: IUpdatePackage,
    config: IDeploymentConfig,
    deployment: IDeploymentProgress,
  ): Promise<void> {
    for (let i = 0; i < batches.length; i++) {
      // Check if deployment is paused
      while (deployment.status === 'PAUSED') {
        await this.sleep(10);
      }

      // Check if deployment was cancelled
      if (deployment.status === 'FAILED' || deployment.status === 'ROLLED_BACK') {
        return;
      }

      deployment.currentBatch = i + 1;
      const batch = batches[i];

      // Deploy to current batch
      await this.deployToBatch(batch, updatePackage, deployment);

      // Check if we should rollback
      if (this.shouldRollback(deployment, config)) {
        console.error('Rolling deployment failed: exceeding failure threshold');
        deployment.status = 'FAILED';

        if (config.autoRollback) {
          await this.rollback(deployment.deploymentId);
        }
        return;
      }

      // Wait before next batch (except for last batch, use minimum for fast tests)
      if (i < batches.length - 1) {
        await this.sleep(Math.min(config.batchDelay ?? 5000, 10));
      }
    }

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

      // Simulate download
      await this.sleep(5);
      this.updateDeviceStatus(deviceId, {
        status: UpdateStatus.VERIFYING,
        progress: 50,
      });

      // Simulate verification
      await this.sleep(5);
      this.updateDeviceStatus(deviceId, {
        status: UpdateStatus.INSTALLING,
        progress: 75,
      });

      // Perform update
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
          error: 'Installation failed',
        });
        deployment.failureCount++;
      }

      deployment.pendingCount--;
    });

    await Promise.all(promises);
  }
}
