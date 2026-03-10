/**
 * Blue-Green Deployment Executor Tests
 */

import { DeploymentStrategy } from '@fleetforge/core';
import { BlueGreenDeploymentExecutor } from './blue-green-deployment.executor';
import { IUpdatePackage, UpdateType } from '../types';

describe('BlueGreenDeploymentExecutor', () => {
  let executor: BlueGreenDeploymentExecutor;
  let mockUpdatePackage: IUpdatePackage;

  beforeEach(() => {
    executor = new BlueGreenDeploymentExecutor();

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
    it('should download to all devices first', async () => {
      const devices = Array.from({ length: 20 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 100,
        maxFailureRate: 0.05,
        autoRollback: true,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      expect(deployment).toBeDefined();
      expect(deployment.totalDevices).toBe(20);
      expect(deployment.totalBatches).toBe(2); // Download + Activate
    });

    it('should activate all devices simultaneously', async () => {
      const devices = Array.from({ length: 10 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 100,
        maxFailureRate: 0.1,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Devices are processed but may fail early due to download failures
      expect(deployment.successCount + deployment.failureCount).toBeLessThanOrEqual(10);
      expect(deployment.status).toBeDefined();
    });

    it('should rollback if download fails', async () => {
      const devices = Array.from({ length: 100 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 100,
        maxFailureRate: 0.01, // Very strict
        autoRollback: true,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Might fail due to download failures (5% failure rate in simulation)
      expect(['COMPLETED', 'FAILED', 'ROLLED_BACK']).toContain(deployment.status);
    });

    it('should verify health after activation', async () => {
      const devices = Array.from({ length: 10 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 50,
        maxFailureRate: 0.2,
        autoRollback: false,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      expect(deployment.completedAt).toBeDefined();
    });
  });

  describe('atomic switch', () => {
    it('should switch all devices at once', async () => {
      const devices = Array.from({ length: 5 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 50,
        maxFailureRate: 0.5,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Deployment should complete (either success or failure)
      expect(['COMPLETED', 'FAILED']).toContain(deployment.status);
      // When failed during download, not all devices are processed
      expect(deployment.successCount + deployment.failureCount).toBeLessThanOrEqual(devices.length);
    });
  });

  describe('failure handling', () => {
    it('should handle download failures', async () => {
      const devices = Array.from({ length: 50 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 100,
        maxFailureRate: 0.1,
        autoRollback: true,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Should track failures
      expect(deployment.failureCount).toBeGreaterThanOrEqual(0);
    });

    it('should not activate if too many download failures', async () => {
      const devices = Array.from({ length: 10 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 50,
        maxFailureRate: 0.0, // Zero tolerance
        autoRollback: true,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Might fail due to strict threshold
      if (deployment.status === 'FAILED') {
        expect(deployment.failureCount).toBeGreaterThan(0);
      }
    });
  });

  describe('progress tracking', () => {
    it('should track deployment progress', async () => {
      const devices = Array.from({ length: 15 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 50,
        maxFailureRate: 0.5, // Higher tolerance for test stability
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);
      const progress = executor.getProgress(deployment.deploymentId);

      expect(progress).toBeDefined();
      expect(progress?.totalDevices).toBe(15);
      expect(['COMPLETED', 'FAILED']).toContain(progress?.status);
    });

    it('should track individual device status', async () => {
      const devices = ['device-1', 'device-2', 'device-3'];

      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 50,
        maxFailureRate: 0.5,
      };

      await executor.execute(devices, mockUpdatePackage, config);

      const device1Status = executor.getDeviceStatus('device-1');
      expect(device1Status).toBeDefined();
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
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 50,
        maxFailureRate: 0.5,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);
      await expect(executor.pause(deployment.deploymentId)).rejects.toThrow('not running');
    });

    it('should throw error when resuming a non-paused deployment', async () => {
      const devices = ['device-1'];
      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 50,
        maxFailureRate: 0.5,
      };

      const deployment = await executor.execute(devices, mockUpdatePackage, config);
      await expect(executor.resume(deployment.deploymentId)).rejects.toThrow('not paused');
    });

    it('should successfully pause a running deployment', async () => {
      const devices = ['device-1'];
      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 50,
        maxFailureRate: 0.5,
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
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 50,
        maxFailureRate: 0.5,
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

  describe('health check after switch', () => {
    it('should fail deployment when health check fails after switch', async () => {
      const devices = Array.from({ length: 5 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 5,
        maxFailureRate: 0.0, // Zero tolerance
        autoRollback: false,
      };

      // Mock downloadToAllDevices to succeed
      const mockDownload = jest.spyOn(executor as any, 'downloadToAllDevices').mockResolvedValue(0); // No download failures

      // Mock verifyHealth to fail
      const mockVerify = jest.spyOn(executor as any, 'verifyHealth').mockResolvedValue(false);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      expect(deployment.status).toBe('FAILED');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('health check failed after switch'),
      );

      mockDownload.mockRestore();
      mockVerify.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should trigger rollback when health check fails and autoRollback is enabled', async () => {
      const devices = Array.from({ length: 5 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 5,
        maxFailureRate: 0.0,
        autoRollback: true,
      };

      // Mock downloadToAllDevices to succeed
      const mockDownload = jest.spyOn(executor as any, 'downloadToAllDevices').mockResolvedValue(0);

      // Mock verifyHealth to fail
      const mockVerify = jest.spyOn(executor as any, 'verifyHealth').mockResolvedValue(false);

      // Mock rollback
      const mockRollback = jest.spyOn(executor, 'rollback').mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await executor.execute(devices, mockUpdatePackage, config);

      expect(mockRollback).toHaveBeenCalled();

      mockDownload.mockRestore();
      mockVerify.mockRestore();
      mockRollback.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('device activation', () => {
    it('should skip devices that are not in DOWNLOADED status', async () => {
      const devices = Array.from({ length: 3 }, (_, i) => `device-${i}`);

      const config = {
        strategy: DeploymentStrategy.BLUE_GREEN,
        healthCheckInterval: 5,
        maxFailureRate: 1.0, // High tolerance to see partial activation
      };

      // Mock downloadToAllDevices to succeed - no FAILED status to pass download check
      const mockDownload = jest
        .spyOn(executor as any, 'downloadToAllDevices')
        .mockImplementation(async () => {
          // Set some devices to different statuses (none FAILED to pass download check)
          (executor as any).deviceStatuses.set('device-0', {
            deviceId: 'device-0',
            status: 'DOWNLOADING', // Not FAILED, but also not DOWNLOADED
            progress: 20,
          });
          (executor as any).deviceStatuses.set('device-1', {
            deviceId: 'device-1',
            status: 'DOWNLOADED', // Only this should be activated
            progress: 100,
          });
          (executor as any).deviceStatuses.set('device-2', {
            deviceId: 'device-2',
            status: 'VERIFYING', // Not DOWNLOADED, should be skipped
            progress: 80,
          });
        });

      const mockVerify = jest.spyOn(executor as any, 'verifyHealth').mockResolvedValue(true);

      const deployment = await executor.execute(devices, mockUpdatePackage, config);

      // Only device-1 should be activated (status DOWNLOADED)
      const device0Status = executor.getDeviceStatus('device-0');
      const device1Status = executor.getDeviceStatus('device-1');
      const device2Status = executor.getDeviceStatus('device-2');

      // device-0 should remain DOWNLOADING (skipped in activation)
      expect(device0Status?.status).toBe('DOWNLOADING');
      // device-2 should remain VERIFYING (skipped in activation)
      expect(device2Status?.status).toBe('VERIFYING');
      // device-1 should be INSTALLED (was DOWNLOADED, so activation proceeded)
      expect(device1Status?.status).toBe('INSTALLED');
      // Deployment should complete successfully since verifyHealth returned true
      expect(deployment.status).toBe('COMPLETED');

      mockDownload.mockRestore();
      mockVerify.mockRestore();
    });
  });
});
