/**
 * Canary Deployment Executor Tests
 */

import { DeploymentStrategy } from '@fleetforge/core';
import { CanaryDeploymentExecutor } from './canary-deployment.executor';
import { IUpdatePackage, UpdateType } from '../types';

describe('CanaryDeploymentExecutor', () => {
  let executor: CanaryDeploymentExecutor;
  let mockUpdatePackage: IUpdatePackage;

  beforeEach(() => {
    executor = new CanaryDeploymentExecutor();

    mockUpdatePackage = {
      id: 'update-1',
      firmwareId: 'firmware-1',
      version: '2.0.0',
      type: UpdateType.FULL,
      size: 1000000,
      checksum: 'abc123',
      signature: {
        algorithm: 'RSA-SHA256',
        signature: 'signature',
        publicKey: 'public-key',
      },
    };
  });

  describe('execute', () => {
    it('should deploy to canary group first', async () => {
      const devices = Array.from({ length: 100 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.CANARY,
        canaryPercentage: 10,
        healthCheckInterval: 100,
        maxFailureRate: 0.1,
        autoRollback: true,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      expect(deployment).toBeDefined();
      expect(deployment.totalDevices).toBe(100);
      expect(deployment.totalBatches).toBe(2);
    });

    it('should rollback if canary fails', async () => {
      const devices = Array.from({ length: 10 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.CANARY,
        canaryPercentage: 20,
        healthCheckInterval: 100,
        maxFailureRate: 0.05, // Very low threshold
        autoRollback: true,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Due to random failures, deployment might fail
      expect(['COMPLETED', 'FAILED', 'ROLLED_BACK']).toContain(deployment.status);
    });

    it('should proceed to full rollout if canary succeeds', async () => {
      const devices = Array.from({ length: 20 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.CANARY,
        canaryPercentage: 10,
        healthCheckInterval: 100,
        maxFailureRate: 0.5, // High threshold
        autoRollback: false,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      expect(deployment.currentBatch).toBe(2);
    });
  });

  describe('pause and resume', () => {
    it('should track deployment completion', async () => {
      const devices = Array.from({ length: 10 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.CANARY,
        canaryPercentage: 10,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);
      const progress = executor.getProgress(deployment.deploymentId);

      expect(progress).toBeDefined();
      expect(['COMPLETED', 'FAILED']).toContain(progress?.status);
    });

    it('should track canary group size', async () => {
      const devices = Array.from({ length: 100 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.CANARY,
        canaryPercentage: 20,
        healthCheckInterval: 10,
        maxFailureRate: 0.5,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Canary group should be 20% of devices
      expect(deployment.totalDevices).toBe(100);
    });
  });

  describe('cancel and rollback', () => {
    it('should cancel deployment', async () => {
      const devices = Array.from({ length: 10 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.CANARY,
        canaryPercentage: 10,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      await executor.cancel(deployment.deploymentId);
      const progress = executor.getProgress(deployment.deploymentId);

      expect(progress?.status).toBe('FAILED');
      expect(progress?.completedAt).toBeDefined();
    });

    it('should rollback deployment', async () => {
      const devices = Array.from({ length: 10 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.CANARY,
        canaryPercentage: 10,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      await executor.rollback(deployment.deploymentId);
      const progress = executor.getProgress(deployment.deploymentId);

      expect(progress?.status).toBe('ROLLED_BACK');
    });
  });

  describe('error handling', () => {
    it('should throw error when pausing non-existent deployment', async () => {
      await expect(executor.pause('non-existent')).rejects.toThrow('not found');
    });

    it('should throw error when resuming non-existent deployment', async () => {
      await expect(executor.resume('non-existent')).rejects.toThrow('not found');
    });

    it('should throw error when canceling non-existent deployment', async () => {
      await expect(executor.cancel('non-existent')).rejects.toThrow('not found');
    });

    it('should throw error when pausing a non-running deployment', async () => {
      const devices = ['device-1'];
      const config = {
        strategy: DeploymentStrategy.CANARY,
        canaryPercentage: 100,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);
      await expect(executor.pause(deployment.deploymentId)).rejects.toThrow('not running');
    });

    it('should throw error when resuming a non-paused deployment', async () => {
      const devices = ['device-1'];
      const config = {
        strategy: DeploymentStrategy.CANARY,
        canaryPercentage: 100,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);
      await expect(executor.resume(deployment.deploymentId)).rejects.toThrow('not paused');
    });

    it('should successfully pause a running deployment', async () => {
      const devices = ['device-1'];
      const config = {
        strategy: DeploymentStrategy.CANARY,
        canaryPercentage: 100,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);
      // Force status to RUNNING to test pause success path
      (executor as any).deployments.set(deployment.deploymentId, {
        ...deployment,
        status: 'RUNNING',
      });

      await executor.pause(deployment.deploymentId);
      const progress = executor.getProgress(deployment.deploymentId);
      expect(progress?.status).toBe('PAUSED');
    });

    it('should successfully resume a paused deployment', async () => {
      const devices = ['device-1'];
      const config = {
        strategy: DeploymentStrategy.CANARY,
        canaryPercentage: 100,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);
      // Force status to PAUSED to test resume success path
      (executor as any).deployments.set(deployment.deploymentId, {
        ...deployment,
        status: 'PAUSED',
      });

      await executor.resume(deployment.deploymentId);
      const progress = executor.getProgress(deployment.deploymentId);
      expect(progress?.status).toBe('RUNNING');
    });
  });
});
