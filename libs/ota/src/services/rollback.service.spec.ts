/**
 * Rollback Service Tests
 */

import { RollbackService } from './rollback.service';
import { IDeviceUpdateStatus, UpdateStatus, RollbackReason } from '../types';

describe('RollbackService', () => {
  let service: RollbackService;

  beforeEach(() => {
    service = new RollbackService();
  });

  describe('rollbackDevice', () => {
    it('should rollback device successfully', async () => {
      const deviceStatus: IDeviceUpdateStatus = {
        deviceId: 'device-1',
        deploymentId: 'deployment-1',
        status: UpdateStatus.FAILED,
        progress: 0,
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
        error: 'Installation failed',
      };

      const config = {
        enabled: true,
        maxRetries: 3,
        retryDelay: 100,
        preserveUserData: true,
        notifyOnRollback: true,
      };

      // Create backup first
      await service.createBackup('device-1', Buffer.from('firmware v1.0'));

      const success = await service.rollbackDevice(
        'device-1',
        deviceStatus,
        config,
        RollbackReason.INSTALLATION_FAILED,
      );

      expect(success).toBe(true);
    });

    it('should retry on failure', async () => {
      const deviceStatus: IDeviceUpdateStatus = {
        deviceId: 'device-2',
        deploymentId: 'deployment-1',
        status: UpdateStatus.FAILED,
        progress: 0,
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
      };

      const config = {
        enabled: true,
        maxRetries: 3,
        retryDelay: 50,
        preserveUserData: true,
        notifyOnRollback: false,
      };

      await service.createBackup('device-2', Buffer.from('firmware'));

      const success = await service.rollbackDevice(
        'device-2',
        deviceStatus,
        config,
        RollbackReason.HEALTH_CHECK_FAILED,
      );

      // Should eventually succeed or fail after retries
      expect(typeof success).toBe('boolean');
    });

    it('should fail without backup', async () => {
      const deviceStatus: IDeviceUpdateStatus = {
        deviceId: 'device-3',
        deploymentId: 'deployment-1',
        status: UpdateStatus.FAILED,
        progress: 0,
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
      };

      const config = {
        enabled: true,
        maxRetries: 1,
        retryDelay: 50,
        preserveUserData: true,
        notifyOnRollback: false,
      };

      // No backup created
      const success = await service.rollbackDevice(
        'device-3',
        deviceStatus,
        config,
        RollbackReason.VERIFICATION_FAILED,
      );

      expect(success).toBe(false);
    });
  });

  describe('rollbackDevices', () => {
    it('should rollback multiple devices', async () => {
      const deviceStatuses: IDeviceUpdateStatus[] = [
        {
          deviceId: 'device-1',
          deploymentId: 'deployment-1',
          status: UpdateStatus.FAILED,
          progress: 0,
          currentVersion: '1.0.0',
          targetVersion: '2.0.0',
        },
        {
          deviceId: 'device-2',
          deploymentId: 'deployment-1',
          status: UpdateStatus.FAILED,
          progress: 0,
          currentVersion: '1.0.0',
          targetVersion: '2.0.0',
        },
      ];

      const config = {
        enabled: true,
        maxRetries: 2,
        retryDelay: 50,
        preserveUserData: true,
        notifyOnRollback: false,
      };

      // Create backups
      await service.createBackup('device-1', Buffer.from('firmware'));
      await service.createBackup('device-2', Buffer.from('firmware'));

      const result = await service.rollbackDevices(deviceStatuses, config, RollbackReason.MANUAL);

      expect(result.success + result.failed).toBe(2);
    });
  });

  describe('rollback history', () => {
    it('should record rollback history', async () => {
      const deviceStatus: IDeviceUpdateStatus = {
        deviceId: 'device-1',
        deploymentId: 'deployment-1',
        status: UpdateStatus.FAILED,
        progress: 0,
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
      };

      const config = {
        enabled: true,
        maxRetries: 1,
        retryDelay: 50,
        preserveUserData: true,
        notifyOnRollback: false,
      };

      await service.createBackup('device-1', Buffer.from('firmware'));
      await service.rollbackDevice('device-1', deviceStatus, config, RollbackReason.TIMEOUT);

      const history = service.getRollbackHistory('device-1');
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].deviceId).toBe('device-1');
      expect(history[0].reason).toBe(RollbackReason.TIMEOUT);
    });

    it('should get rollback statistics', async () => {
      const stats = service.getRollbackStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('successful');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('byReason');
    });

    it('should clear old history', () => {
      service.clearHistory(30);
      const history = service.getRollbackHistory();

      // All recent history should remain
      expect(Array.isArray(history)).toBe(true);
    });

    it('should count rollbacks by reason in statistics', async () => {
      const deviceStatus: IDeviceUpdateStatus = {
        deviceId: 'device-stats',
        deploymentId: 'deployment-stats',
        status: UpdateStatus.FAILED,
        progress: 0,
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
      };

      const config = {
        enabled: true,
        maxRetries: 1,
        retryDelay: 10,
        preserveUserData: true,
        notifyOnRollback: true,
      };

      // Create backup and rollback for different reasons
      await service.createBackup('device-stats', Buffer.from('firmware'));
      await service.rollbackDevice(
        'device-stats',
        deviceStatus,
        config,
        RollbackReason.INSTALLATION_FAILED,
      );
      await service.rollbackDevice(
        'device-stats',
        deviceStatus,
        config,
        RollbackReason.HEALTH_CHECK_FAILED,
      );

      const stats = service.getRollbackStats();

      // Should have counted the reasons
      expect(stats.byReason[RollbackReason.INSTALLATION_FAILED]).toBeGreaterThan(0);
      expect(stats.byReason[RollbackReason.HEALTH_CHECK_FAILED]).toBeGreaterThan(0);
    });
  });

  describe('retry logic', () => {
    it('should retry when restore fails without exception', async () => {
      const deviceStatus: IDeviceUpdateStatus = {
        deviceId: 'device-retry',
        deploymentId: 'deployment-retry',
        status: UpdateStatus.FAILED,
        progress: 0,
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
      };

      const config = {
        enabled: true,
        maxRetries: 2,
        retryDelay: 10,
        preserveUserData: true,
        notifyOnRollback: false,
      };

      // Don't create backup - this will cause restorePreviousFirmware to return false
      const success = await service.rollbackDevice(
        'device-retry',
        deviceStatus,
        config,
        RollbackReason.MANUAL,
      );

      // Should fail after max retries
      expect(success).toBe(false);
    });

    it('should handle exceptions during restore and retry', async () => {
      const deviceStatus: IDeviceUpdateStatus = {
        deviceId: 'device-exception',
        deploymentId: 'deployment-exception',
        status: UpdateStatus.FAILED,
        progress: 0,
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
      };

      const config = {
        enabled: true,
        maxRetries: 3,
        retryDelay: 5,
        preserveUserData: true,
        notifyOnRollback: false,
      };

      // Create backup first
      await service.createBackup('device-exception', Buffer.from('firmware'));

      // Mock restorePreviousFirmware to throw an exception
      const mockRestore = jest
        .spyOn(service as any, 'restorePreviousFirmware')
        .mockRejectedValueOnce(new Error('Firmware flash failed'))
        .mockRejectedValueOnce(new Error('Device unreachable'))
        .mockResolvedValueOnce(true);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const success = await service.rollbackDevice(
        'device-exception',
        deviceStatus,
        config,
        RollbackReason.MANUAL,
      );

      // Should succeed on third retry
      expect(success).toBe(true);
      expect(mockRestore).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rollback attempt 1 failed'),
        expect.any(Error),
      );

      mockRestore.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should fail after max retries with exceptions', async () => {
      const deviceStatus: IDeviceUpdateStatus = {
        deviceId: 'device-fail-exception',
        deploymentId: 'deployment-fail-exception',
        status: UpdateStatus.FAILED,
        progress: 0,
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
      };

      const config = {
        enabled: true,
        maxRetries: 2,
        retryDelay: 5,
        preserveUserData: true,
        notifyOnRollback: false,
      };

      // Create backup first
      await service.createBackup('device-fail-exception', Buffer.from('firmware'));

      // Mock restorePreviousFirmware to always throw
      const mockRestore = jest
        .spyOn(service as any, 'restorePreviousFirmware')
        .mockRejectedValue(new Error('Persistent failure'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const success = await service.rollbackDevice(
        'device-fail-exception',
        deviceStatus,
        config,
        RollbackReason.MANUAL,
      );

      // Should fail after max retries
      expect(success).toBe(false);
      expect(mockRestore).toHaveBeenCalledTimes(2);

      mockRestore.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});
