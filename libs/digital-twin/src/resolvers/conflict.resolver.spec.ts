/**
 * Conflict Resolver Tests
 */

import { ConflictResolver } from './conflict.resolver';
import {
  IConflict,
  IDeviceState,
  IShadowState,
  ConflictResolutionStrategy,
} from '../types';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('resolve', () => {
    const mockConflict: IConflict = {
      id: 'conflict-1',
      deviceId: 'device-1',
      path: 'temperature',
      deviceValue: 25,
      cloudValue: 20,
      deviceVersion: 2,
      cloudVersion: 1,
      timestamp: new Date(),
      resolved: false,
    };

    it('should resolve with DEVICE_WINS strategy', () => {
      const result = resolver.resolve(mockConflict, ConflictResolutionStrategy.DEVICE_WINS);
      expect(result).toBe(25);
    });

    it('should resolve with CLOUD_WINS strategy', () => {
      const result = resolver.resolve(mockConflict, ConflictResolutionStrategy.CLOUD_WINS);
      expect(result).toBe(20);
    });

    it('should resolve with LAST_WRITE_WINS strategy', () => {
      const result = resolver.resolve(mockConflict, ConflictResolutionStrategy.LAST_WRITE_WINS);
      expect(result).toBe(25); // Device has higher version
    });

    it('should resolve with MERGE strategy for numbers', () => {
      const result = resolver.resolve(mockConflict, ConflictResolutionStrategy.MERGE);
      expect(result).toBe(22.5); // Average of 25 and 20
    });

    it('should resolve with MERGE strategy for objects', () => {
      const conflict: IConflict = {
        ...mockConflict,
        deviceValue: { a: 1, b: 2 },
        cloudValue: { b: 3, c: 4 },
      };

      const result = resolver.resolve(conflict, ConflictResolutionStrategy.MERGE);
      expect(result).toEqual({ a: 1, b: 2, c: 4 });
    });

    it('should resolve with MERGE strategy for arrays', () => {
      const conflict: IConflict = {
        ...mockConflict,
        deviceValue: [1, 2, 3],
        cloudValue: [2, 3, 4],
      };

      const result = resolver.resolve(conflict, ConflictResolutionStrategy.MERGE);
      expect(result).toEqual([2, 3, 4, 1]); // Deduplicated
    });

    it('should throw error for MANUAL strategy', () => {
      expect(() => {
        resolver.resolve(mockConflict, ConflictResolutionStrategy.MANUAL);
      }).toThrow('Manual resolution required');
    });
  });

  describe('detectConflicts', () => {
    it('should detect conflicts', () => {
      const deviceState: IDeviceState = {
        deviceId: 'device-1',
        version: 2,
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

      const shadowState: IShadowState = {
        deviceId: 'device-1',
        version: 1,
        timestamp: new Date(),
        desired: {},
        reported: {
          temperature: 20,
          humidity: 60,
        },
        delta: {},
        metadata: {
          desiredVersion: 0,
          reportedVersion: 1,
          lastSync: new Date(),
        },
      };

      const conflicts = resolver.detectConflicts(deviceState, shadowState);

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].path).toBe('temperature');
      expect(conflicts[0].deviceValue).toBe(25);
      expect(conflicts[0].cloudValue).toBe(20);
    });

    it('should not detect conflicts for same values', () => {
      const deviceState: IDeviceState = {
        deviceId: 'device-1',
        version: 1,
        timestamp: new Date(),
        reported: { temperature: 25 },
        metadata: {
          connectivity: true,
          lastSeen: new Date(),
        },
      };

      const shadowState: IShadowState = {
        deviceId: 'device-1',
        version: 1,
        timestamp: new Date(),
        desired: {},
        reported: { temperature: 25 },
        delta: {},
        metadata: {
          desiredVersion: 0,
          reportedVersion: 1,
          lastSync: new Date(),
        },
      };

      const conflicts = resolver.detectConflicts(deviceState, shadowState);
      expect(conflicts.length).toBe(0);
    });

    it('should not detect conflicts for undefined values', () => {
      const deviceState: IDeviceState = {
        deviceId: 'device-1',
        version: 1,
        timestamp: new Date(),
        reported: { temperature: 25 },
        metadata: {
          connectivity: true,
          lastSeen: new Date(),
        },
      };

      const shadowState: IShadowState = {
        deviceId: 'device-1',
        version: 1,
        timestamp: new Date(),
        desired: {},
        reported: {},
        delta: {},
        metadata: {
          desiredVersion: 0,
          reportedVersion: 1,
          lastSync: new Date(),
        },
      };

      const conflicts = resolver.detectConflicts(deviceState, shadowState);
      expect(conflicts.length).toBe(0);
    });
  });

  describe('applyResolution', () => {
    it('should apply resolution', () => {
      const conflict: IConflict = {
        id: 'conflict-1',
        deviceId: 'device-1',
        path: 'temperature',
        deviceValue: 25,
        cloudValue: 20,
        deviceVersion: 2,
        cloudVersion: 1,
        timestamp: new Date(),
        resolved: false,
      };

      const resolved = resolver.applyResolution(
        conflict,
        ConflictResolutionStrategy.DEVICE_WINS,
      );

      expect(resolved.resolved).toBe(true);
      expect(resolved.resolution?.resolvedValue).toBe(25);
      expect(resolved.resolution?.strategy).toBe(ConflictResolutionStrategy.DEVICE_WINS);
    });

    it('should apply custom value', () => {
      const conflict: IConflict = {
        id: 'conflict-1',
        deviceId: 'device-1',
        path: 'temperature',
        deviceValue: 25,
        cloudValue: 20,
        deviceVersion: 2,
        cloudVersion: 1,
        timestamp: new Date(),
        resolved: false,
      };

      const resolved = resolver.applyResolution(
        conflict,
        ConflictResolutionStrategy.MANUAL,
        30,
      );

      expect(resolved.resolved).toBe(true);
      expect(resolved.resolution?.resolvedValue).toBe(30);
    });
  });
});

