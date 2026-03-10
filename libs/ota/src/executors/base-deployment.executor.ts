/**
 * Base Deployment Executor
 * Abstract base class for deployment strategy executors
 */

import {
  IDeploymentExecutor,
  IDeploymentConfig,
  IDeploymentProgress,
  IUpdatePackage,
  IDeviceUpdateStatus,
  UpdateStatus,
} from '../types';

export abstract class BaseDeploymentExecutor implements IDeploymentExecutor {
  protected deployments = new Map<string, IDeploymentProgress>();
  protected deviceStatuses = new Map<string, IDeviceUpdateStatus>();

  abstract execute(
    devices: string[],
    updatePackage: IUpdatePackage,
    config: IDeploymentConfig,
  ): Promise<IDeploymentProgress>;

  async pause(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    if (deployment.status !== 'RUNNING') {
      throw new Error(`Deployment ${deploymentId} is not running`);
    }

    deployment.status = 'PAUSED';
  }

  async resume(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    if (deployment.status !== 'PAUSED') {
      throw new Error(`Deployment ${deploymentId} is not paused`);
    }

    deployment.status = 'RUNNING';
  }

  async cancel(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    deployment.status = 'FAILED';
    deployment.completedAt = new Date();
  }

  async rollback(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    deployment.status = 'ROLLED_BACK';
    deployment.completedAt = new Date();

    // Mark all devices as rolled back
    for (const [_deviceId, status] of this.deviceStatuses.entries()) {
      if (status.deploymentId === deploymentId) {
        status.status = UpdateStatus.ROLLED_BACK;
        status.completedAt = new Date();
      }
    }
  }

  /**
   * Get deployment progress
   */
  getProgress(deploymentId: string): IDeploymentProgress | undefined {
    return this.deployments.get(deploymentId);
  }

  /**
   * Get device update status
   */
  getDeviceStatus(deviceId: string): IDeviceUpdateStatus | undefined {
    return this.deviceStatuses.get(deviceId);
  }

  /**
   * Update device status
   */
  protected updateDeviceStatus(deviceId: string, status: Partial<IDeviceUpdateStatus>): void {
    const current = this.deviceStatuses.get(deviceId);
    if (current) {
      this.deviceStatuses.set(deviceId, { ...current, ...status });
    }
  }

  /**
   * Update deployment progress
   */
  protected updateProgress(deploymentId: string, updates: Partial<IDeploymentProgress>): void {
    const current = this.deployments.get(deploymentId);
    if (current) {
      this.deployments.set(deploymentId, { ...current, ...updates });
    }
  }

  /**
   * Calculate failure rate
   */
  protected calculateFailureRate(deployment: IDeploymentProgress): number {
    const total = deployment.successCount + deployment.failureCount;
    if (total === 0) return 0;
    return deployment.failureCount / total;
  }

  /**
   * Check if deployment should rollback
   */
  protected shouldRollback(deployment: IDeploymentProgress, config: IDeploymentConfig): boolean {
    if (!config.autoRollback) return false;

    const failureRate = this.calculateFailureRate(deployment);
    const maxFailureRate = config.maxFailureRate ?? 0.1;

    return failureRate > maxFailureRate;
  }

  /**
   * Split devices into batches
   */
  protected createBatches(devices: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < devices.length; i += batchSize) {
      batches.push(devices.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Simulate device update (to be replaced with actual implementation)
   */
  protected async updateDevice(
    _deviceId: string,
    _updatePackage: IUpdatePackage,
  ): Promise<boolean> {
    // Simulate update process (using short delay for testing)
    await this.sleep(Math.random() * 10);

    // 90% success rate for simulation
    return Math.random() > 0.1;
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
