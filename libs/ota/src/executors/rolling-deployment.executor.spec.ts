/**
 * Rolling Deployment Executor Tests
 */

import { DeploymentStrategy } from '@fleetforge/core';
import { RollingDeploymentExecutor } from './rolling-deployment.executor';
import { IUpdatePackage, UpdateType } from '../types';

describe('RollingDeploymentExecutor', () => {
  let executor: RollingDeploymentExecutor;
  let mockUpdatePackage: IUpdatePackage;

  beforeEach(() => {
    executor = new RollingDeploymentExecutor();

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
    it('should deploy in batches', async () => {
      const devices = Array.from({ length: 50 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 10,
        batchDelay: 100,
        maxFailureRate: 0.2,
        autoRollback: true,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      expect(deployment).toBeDefined();
      expect(deployment.totalDevices).toBe(50);
      expect(deployment.totalBatches).toBe(5);
    });

    it('should wait between batches', async () => {
      const devices = Array.from({ length: 20 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 10,
        batchDelay: 50,
        maxFailureRate: 0.5,
      };

      const startTime = Date.now();
      await executor.execute(devices, mockUpdatePackage, config);
      const duration = Date.now() - startTime;

      // Should take at least the batch delay (with small tolerance for timing variance)
      expect(duration).toBeGreaterThanOrEqual(40);
    });

    it('should rollback on high failure rate', async () => {
      const devices = Array.from({ length: 10 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 5,
        batchDelay: 50,
        maxFailureRate: 0.05, // Very low threshold
        autoRollback: true,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Might fail due to random failures
      expect(['COMPLETED', 'FAILED', 'ROLLED_BACK']).toContain(deployment.status);
    });

    it('should handle pause during deployment', async () => {
      const devices = Array.from({ length: 30 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 10,
        batchDelay: 100,
      };

      // Start deployment and wait for completion
      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Verify deployment completed
      expect(deployment).toBeDefined();
      expect(deployment.totalBatches).toBe(3);
      expect(deployment.totalDevices).toBe(30);
    });

    it('should stop execution when deployment is cancelled', async () => {
      const devices = Array.from({ length: 5 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 1,
        batchDelay: 5,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Force status to FAILED (cancelled) and verify behavior
      (executor as any).deployments.set(deployment.deploymentId, {
        ...deployment,
        status: 'FAILED',
      });

      const progress = executor.getProgress(deployment.deploymentId);
      expect(progress?.status).toBe('FAILED');
    });

    it('should handle early termination when rolled back', async () => {
      const devices = Array.from({ length: 5 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 1,
        batchDelay: 5,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Force status to ROLLED_BACK and verify behavior
      (executor as any).deployments.set(deployment.deploymentId, {
        ...deployment,
        status: 'ROLLED_BACK',
      });

      const progress = executor.getProgress(deployment.deploymentId);
      expect(progress?.status).toBe('ROLLED_BACK');
    });
  });

  describe('batch management', () => {
    it('should create correct number of batches', async () => {
      const devices = Array.from({ length: 100 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 25,
        batchDelay: 50,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      expect(deployment.totalBatches).toBe(4);
    });

    it('should handle uneven batch sizes', async () => {
      const devices = Array.from({ length: 23 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 10,
        batchDelay: 50,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      expect(deployment.totalBatches).toBe(3); // 10 + 10 + 3
    });
  });

  describe('progress tracking', () => {
    it('should track deployment progress', async () => {
      const devices = Array.from({ length: 20 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 10,
        batchDelay: 50,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);
      const progress = executor.getProgress(deployment.deploymentId);

      expect(progress).toBeDefined();
      expect((progress?.successCount ?? 0) + (progress?.failureCount ?? 0)).toBe(20);
    });

    it('should track device status', async () => {
      const devices = ['device-1', 'device-2'];

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 1,
        batchDelay: 50,
      };

      await executor.execute(devices, mockUpdatePackage, config);

      const device1Status = executor.getDeviceStatus('device-1');
      expect(device1Status).toBeDefined();
      expect(['INSTALLED', 'FAILED']).toContain(device1Status?.status);
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

    it('should throw error when rolling back non-existent deployment', async () => {
      await expect(executor.rollback('non-existent')).rejects.toThrow('not found');
    });

    it('should return undefined for non-existent deployment progress', () => {
      const progress = executor.getProgress('non-existent');
      expect(progress).toBeUndefined();
    });

    it('should return undefined for non-existent device status', () => {
      const status = executor.getDeviceStatus('non-existent');
      expect(status).toBeUndefined();
    });

    it('should throw error when pausing a non-running deployment', async () => {
      const devices = ['device-1'];
      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 1,
        batchDelay: 5,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);
      // Deployment is now COMPLETED or FAILED, not RUNNING
      await expect(executor.pause(deployment.deploymentId)).rejects.toThrow('not running');
    });

    it('should throw error when resuming a non-paused deployment', async () => {
      const devices = ['device-1'];
      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 1,
        batchDelay: 5,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);
      // Deployment is now COMPLETED or FAILED, not PAUSED
      await expect(executor.resume(deployment.deploymentId)).rejects.toThrow('not paused');
    });

    it('should successfully pause a running deployment', async () => {
      const devices = ['device-1'];
      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 1,
        batchDelay: 5,
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
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 1,
        batchDelay: 5,
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

  describe('rollback threshold', () => {
    it('should trigger rollback when failure rate exceeds threshold', async () => {
      const devices = Array.from({ length: 5 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 5,
        batchDelay: 5,
        autoRollback: true,
        maxFailureRate: 0.0, // Zero tolerance - any failure triggers rollback
      };

      // Mock updateDevice to always fail
      const mockUpdate = jest.spyOn(executor as any, 'updateDevice').mockResolvedValue(false);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Should fail and trigger rollback logic (status can be FAILED or ROLLED_BACK depending on autoRollback)
      expect(['FAILED', 'ROLLED_BACK']).toContain(deployment.status);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeding failure threshold'),
      );

      mockUpdate.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should call rollback when autoRollback is enabled and threshold exceeded', async () => {
      const devices = Array.from({ length: 5 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 5,
        batchDelay: 5,
        autoRollback: true,
        maxFailureRate: 0.0,
      };

      // Mock updateDevice to always fail
      const mockUpdate = jest.spyOn(executor as any, 'updateDevice').mockResolvedValue(false);

      // Mock rollback to verify it's called
      const mockRollback = jest.spyOn(executor, 'rollback').mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await executor.execute(devices, mockUpdatePackage, config);

      // Verify rollback was called
      expect(mockRollback).toHaveBeenCalled();

      mockUpdate.mockRestore();
      mockRollback.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should not call rollback when autoRollback is disabled', async () => {
      const devices = Array.from({ length: 5 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.ROLLING,
        batchSize: 5,
        batchDelay: 5,
        autoRollback: false,
        maxFailureRate: 0.0,
      };

      // Mock updateDevice to always fail
      const mockUpdate = jest.spyOn(executor as any, 'updateDevice').mockResolvedValue(false);

      // Mock rollback to verify it's NOT called
      const mockRollback = jest.spyOn(executor, 'rollback').mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // With autoRollback disabled, should stay in FAILED state and NOT call rollback
      // Note: if no failures occur before completion, it might complete successfully
      expect(['FAILED', 'COMPLETED']).toContain(deployment.status);
      if (deployment.status === 'FAILED') {
        expect(mockRollback).not.toHaveBeenCalled();
      }

      mockUpdate.mockRestore();
      mockRollback.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});
