/**
 * State Synchronizer Tests
 */

import { StateSynchronizer } from './state.synchronizer';
import { ShadowStateManager } from '../managers/shadow-state.manager';
import { ConflictResolver } from '../resolvers/conflict.resolver';
import {
  IDeviceState,
  ISyncConfig,
  SyncDirection,
  ConflictResolutionStrategy,
  SyncStatus,
} from '../types';

describe('StateSynchronizer', () => {
  let synchronizer: StateSynchronizer;
  let shadowManager: ShadowStateManager;
  let conflictResolver: ConflictResolver;
  let config: ISyncConfig;

  beforeEach(() => {
    shadowManager = new ShadowStateManager();
    conflictResolver = new ConflictResolver();
    config = {
      direction: SyncDirection.BIDIRECTIONAL,
      conflictResolution: ConflictResolutionStrategy.DEVICE_WINS,
      batchSize: 10,
      retryAttempts: 3,
      retryDelay: 1000,
      enableDelta: true,
    };
    synchronizer = new StateSynchronizer(shadowManager, conflictResolver, config);
  });

  describe('sync', () => {
    it('should sync device state on first sync', async () => {
      const deviceState: IDeviceState = {
        deviceId: 'device-1',
        version: 1,
        timestamp: new Date(),
        reported: {
          temperature: 25,
          humidity: 60,
        },
        metadata: {
          connectivity: true,
          lastSeen: new Date(),
        },
      };

      const result = await synchronizer.sync('device-1', deviceState);

      expect(result.success).toBe(true);
      expect(result.status).toBe(SyncStatus.IN_SYNC);
      expect(result.changesApplied).toBe(2);
      expect(result.conflicts.length).toBe(0);
    });

    it('should detect conflicts', async () => {
      // First sync
      await shadowManager.updateReported('device-1', { temperature: 20 });

      // Device reports different value
      const deviceState: IDeviceState = {
        deviceId: 'device-1',
        version: 2,
        timestamp: new Date(),
        reported: {
          temperature: 25,
        },
        metadata: {
          connectivity: true,
          lastSeen: new Date(),
        },
      };

      const result = await synchronizer.sync('device-1', deviceState);

      expect(result.success).toBe(false);
      expect(result.status).toBe(SyncStatus.CONFLICT);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('should auto-resolve conflicts', async () => {
      // Setup conflict
      await shadowManager.updateReported('device-1', { temperature: 20 });

      const deviceState: IDeviceState = {
        deviceId: 'device-1',
        version: 2,
        timestamp: new Date(),
        reported: {
          temperature: 25,
        },
        metadata: {
          connectivity: true,
          lastSeen: new Date(),
        },
      };

      await synchronizer.sync('device-1', deviceState);

      // Conflicts should be auto-resolved
      const conflicts = await synchronizer.getConflicts('device-1');
      expect(conflicts.length).toBe(0);
    });

    it('should handle sync errors', async () => {
      const deviceState: IDeviceState = {
        deviceId: 'device-1',
        version: 1,
        timestamp: new Date(),
        reported: {
          temperature: 25,
        },
        metadata: {
          connectivity: true,
          lastSeen: new Date(),
        },
      };

      // Force error by using invalid shadow manager
      const badSynchronizer = new StateSynchronizer(null as any, conflictResolver, config);

      const result = await badSynchronizer.sync('device-1', deviceState);

      expect(result.success).toBe(false);
      expect(result.status).toBe(SyncStatus.ERROR);
      expect(result.error).toBeDefined();
    });
  });

  describe('syncBatch', () => {
    it('should sync multiple devices', async () => {
      const states: IDeviceState[] = [
        {
          deviceId: 'device-1',
          version: 1,
          timestamp: new Date(),
          reported: { temperature: 25 },
          metadata: { connectivity: true, lastSeen: new Date() },
        },
        {
          deviceId: 'device-2',
          version: 1,
          timestamp: new Date(),
          reported: { temperature: 22 },
          metadata: { connectivity: true, lastSeen: new Date() },
        },
      ];

      const results = await synchronizer.syncBatch(states);

      expect(results.length).toBe(2);
      expect(results[0].deviceId).toBe('device-1');
      expect(results[1].deviceId).toBe('device-2');
    });

    it('should respect batch size', async () => {
      const states: IDeviceState[] = Array.from({ length: 25 }, (_, i) => ({
        deviceId: `device-${i}`,
        version: 1,
        timestamp: new Date(),
        reported: { temperature: 20 + i },
        metadata: { connectivity: true, lastSeen: new Date() },
      }));

      const results = await synchronizer.syncBatch(states);

      expect(results.length).toBe(25);
    });
  });

  describe('resolveConflict', () => {
    it('should resolve conflict', async () => {
      // Create a synchronizer with MANUAL resolution to keep conflicts
      const manualConfig: ISyncConfig = {
        ...config,
        conflictResolution: ConflictResolutionStrategy.MANUAL,
      };
      const manualSynchronizer = new StateSynchronizer(
        shadowManager,
        conflictResolver,
        manualConfig,
      );

      // Create conflict
      await shadowManager.updateReported('device-1', { temperature: 20 });

      const deviceState: IDeviceState = {
        deviceId: 'device-1',
        version: 2,
        timestamp: new Date(),
        reported: { temperature: 25 },
        metadata: { connectivity: true, lastSeen: new Date() },
      };

      const result = await manualSynchronizer.sync('device-1', deviceState);
      const conflicts = result.conflicts;

      expect(conflicts.length).toBeGreaterThan(0);

      // Resolve conflict
      await manualSynchronizer.resolveConflict(
        conflicts[0].id,
        ConflictResolutionStrategy.CLOUD_WINS,
      );

      const remainingConflicts = await manualSynchronizer.getConflicts('device-1');
      expect(remainingConflicts.length).toBe(0);
    });

    it('should throw error for non-existent conflict', async () => {
      await expect(
        synchronizer.resolveConflict('non-existent', ConflictResolutionStrategy.DEVICE_WINS),
      ).rejects.toThrow('Conflict non-existent not found');
    });
  });

  describe('getSyncMetrics', () => {
    it('should track sync metrics', async () => {
      const deviceState: IDeviceState = {
        deviceId: 'device-1',
        version: 1,
        timestamp: new Date(),
        reported: { temperature: 25 },
        metadata: { connectivity: true, lastSeen: new Date() },
      };

      await synchronizer.sync('device-1', deviceState);
      await synchronizer.sync('device-1', deviceState);

      const metrics = synchronizer.getSyncMetrics('device-1');

      expect(metrics.totalSyncs).toBe(2);
      expect(metrics.successfulSyncs).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0);
    });

    it('should return zero metrics for non-existent device', () => {
      const metrics = synchronizer.getSyncMetrics('non-existent');

      expect(metrics.totalSyncs).toBe(0);
      expect(metrics.successfulSyncs).toBe(0);
      expect(metrics.successRate).toBe(0);
    });
  });
});
