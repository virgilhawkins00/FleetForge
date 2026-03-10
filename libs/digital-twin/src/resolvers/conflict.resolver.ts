/**
 * Conflict Resolver
 * Handles conflicts between device and cloud states
 */

import {
  IConflict,
  IConflictResolver,
  IDeviceState,
  IShadowState,
  ConflictResolutionStrategy,
} from '../types';

// Simple UUID generator (avoids ESM issues with uuid package)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class ConflictResolver implements IConflictResolver {
  /**
   * Resolve a conflict using the specified strategy
   */
  resolve(conflict: IConflict, strategy: ConflictResolutionStrategy): any {
    switch (strategy) {
      case ConflictResolutionStrategy.DEVICE_WINS:
        return conflict.deviceValue;

      case ConflictResolutionStrategy.CLOUD_WINS:
        return conflict.cloudValue;

      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        return this.resolveLastWriteWins(conflict);

      case ConflictResolutionStrategy.MERGE:
        return this.resolveMerge(conflict);

      case ConflictResolutionStrategy.MANUAL:
        throw new Error('Manual resolution required');

      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }
  }

  /**
   * Detect conflicts between device and shadow states
   */
  detectConflicts(deviceState: IDeviceState, shadowState: IShadowState): IConflict[] {
    const conflicts: IConflict[] = [];

    // Compare reported states
    const allKeys = new Set([
      ...Object.keys(deviceState.reported),
      ...Object.keys(shadowState.reported),
    ]);

    for (const key of allKeys) {
      const deviceValue = deviceState.reported[key];
      const cloudValue = shadowState.reported[key];

      if (this.hasConflict(deviceValue, cloudValue, deviceState.version, shadowState.version)) {
        conflicts.push({
          id: generateUUID(),
          deviceId: deviceState.deviceId,
          path: key,
          deviceValue,
          cloudValue,
          deviceVersion: deviceState.version,
          cloudVersion: shadowState.version,
          timestamp: new Date(),
          resolved: false,
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if there's a conflict
   */
  private hasConflict(
    deviceValue: any,
    cloudValue: any,
    _deviceVersion: number,
    _cloudVersion: number,
  ): boolean {
    // No conflict if values are the same
    if (this.areEqual(deviceValue, cloudValue)) {
      return false;
    }

    // No conflict if one is undefined
    if (deviceValue === undefined || cloudValue === undefined) {
      return false;
    }

    // Conflict exists if values differ
    return true;
  }

  /**
   * Resolve using last write wins strategy
   */
  private resolveLastWriteWins(conflict: IConflict): any {
    // Higher version wins
    if (conflict.deviceVersion > conflict.cloudVersion) {
      return conflict.deviceValue;
    } else if (conflict.cloudVersion > conflict.deviceVersion) {
      return conflict.cloudValue;
    }

    // If versions are equal, device wins (tie-breaker)
    return conflict.deviceValue;
  }

  /**
   * Resolve using merge strategy
   */
  private resolveMerge(conflict: IConflict): any {
    const deviceValue = conflict.deviceValue;
    const cloudValue = conflict.cloudValue;

    // If both are objects, merge them
    if (this.isObject(deviceValue) && this.isObject(cloudValue)) {
      return { ...cloudValue, ...deviceValue };
    }

    // If both are arrays, concatenate and deduplicate
    if (Array.isArray(deviceValue) && Array.isArray(cloudValue)) {
      return [...new Set([...cloudValue, ...deviceValue])];
    }

    // If both are numbers, take average
    if (typeof deviceValue === 'number' && typeof cloudValue === 'number') {
      return (deviceValue + cloudValue) / 2;
    }

    // Default to device value
    return deviceValue;
  }

  /**
   * Check if two values are equal
   */
  private areEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    return false;
  }

  /**
   * Check if value is an object
   */
  private isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Apply resolution to conflict
   */
  applyResolution(
    conflict: IConflict,
    strategy: ConflictResolutionStrategy,
    customValue?: any,
  ): IConflict {
    const resolvedValue =
      customValue !== undefined ? customValue : this.resolve(conflict, strategy);

    return {
      ...conflict,
      resolved: true,
      resolution: {
        strategy,
        resolvedValue,
        resolvedAt: new Date(),
      },
    };
  }
}
