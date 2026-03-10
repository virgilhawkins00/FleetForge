/**
 * Shadow State Manager
 * Manages device shadow states (desired and reported)
 */

import { IShadowState, IShadowStateManager } from '../types';

export class ShadowStateManager implements IShadowStateManager {
  private shadows = new Map<string, IShadowState>();

  /**
   * Get shadow state for a device
   */
  async getShadow(deviceId: string): Promise<IShadowState | null> {
    return this.shadows.get(deviceId) || null;
  }

  /**
   * Update desired state (cloud-side)
   */
  async updateDesired(deviceId: string, desired: Record<string, any>): Promise<IShadowState> {
    const shadow = await this.getOrCreateShadow(deviceId);

    // Merge desired state
    shadow.desired = { ...shadow.desired, ...desired };
    shadow.metadata.desiredVersion++;
    shadow.version++;
    shadow.timestamp = new Date();

    // Calculate delta (what device needs to apply)
    shadow.delta = this.calculateDelta(shadow.reported, shadow.desired);

    this.shadows.set(deviceId, shadow);
    return shadow;
  }

  /**
   * Update reported state (device-side)
   */
  async updateReported(deviceId: string, reported: Record<string, any>): Promise<IShadowState> {
    const shadow = await this.getOrCreateShadow(deviceId);

    // Merge reported state
    shadow.reported = { ...shadow.reported, ...reported };
    shadow.metadata.reportedVersion++;
    shadow.version++;
    shadow.timestamp = new Date();
    shadow.metadata.lastSync = new Date();

    // Recalculate delta
    shadow.delta = this.calculateDelta(shadow.reported, shadow.desired);

    this.shadows.set(deviceId, shadow);
    return shadow;
  }

  /**
   * Get delta (difference between desired and reported)
   */
  async getDelta(deviceId: string): Promise<Record<string, any>> {
    const shadow = await this.getShadow(deviceId);
    return shadow?.delta || {};
  }

  /**
   * Delete shadow state
   */
  async deleteShadow(deviceId: string): Promise<void> {
    this.shadows.delete(deviceId);
  }

  /**
   * Get or create shadow state
   */
  private async getOrCreateShadow(deviceId: string): Promise<IShadowState> {
    let shadow = this.shadows.get(deviceId);

    if (!shadow) {
      shadow = {
        deviceId,
        version: 0,
        timestamp: new Date(),
        desired: {},
        reported: {},
        delta: {},
        metadata: {
          desiredVersion: 0,
          reportedVersion: 0,
          lastSync: new Date(),
        },
      };
      this.shadows.set(deviceId, shadow);
    }

    return shadow;
  }

  /**
   * Calculate delta between reported and desired states
   */
  private calculateDelta(
    reported: Record<string, any>,
    desired: Record<string, any>,
  ): Record<string, any> {
    const delta: Record<string, any> = {};

    // Find differences
    for (const key in desired) {
      if (this.isDifferent(reported[key], desired[key])) {
        delta[key] = desired[key];
      }
    }

    return delta;
  }

  /**
   * Check if two values are different
   */
  private isDifferent(a: any, b: any): boolean {
    if (a === b) return false;
    if (a == null || b == null) return true;
    if (typeof a !== typeof b) return true;

    if (typeof a === 'object') {
      return JSON.stringify(a) !== JSON.stringify(b);
    }

    return a !== b;
  }

  /**
   * Get all shadows
   */
  async getAllShadows(): Promise<IShadowState[]> {
    return Array.from(this.shadows.values());
  }

  /**
   * Get shadows by filter
   */
  async getShadowsByFilter(filter: (shadow: IShadowState) => boolean): Promise<IShadowState[]> {
    return Array.from(this.shadows.values()).filter(filter);
  }

  /**
   * Clear all shadows
   */
  async clearAll(): Promise<void> {
    this.shadows.clear();
  }

  /**
   * Get shadow statistics
   */
  async getStatistics(): Promise<{
    total: number;
    withDelta: number;
    averageVersion: number;
  }> {
    const shadows = Array.from(this.shadows.values());
    const total = shadows.length;
    const withDelta = shadows.filter((s) => Object.keys(s.delta).length > 0).length;
    const averageVersion = total > 0 ? shadows.reduce((sum, s) => sum + s.version, 0) / total : 0;

    return { total, withDelta, averageVersion };
  }
}
