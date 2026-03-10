/**
 * State Synchronizer
 * Handles bidirectional state synchronization between device and cloud
 */

import {
  IStateSynchronizer,
  IDeviceState,
  ISyncResult,
  ISyncConfig,
  IConflict,
  SyncStatus,
  SyncDirection,
  ConflictResolutionStrategy,
} from '../types';
import { ShadowStateManager } from '../managers/shadow-state.manager';
import { ConflictResolver } from '../resolvers/conflict.resolver';

export class StateSynchronizer implements IStateSynchronizer {
  private conflicts = new Map<string, IConflict[]>();
  private syncMetrics = new Map<string, { totalSyncs: number; successfulSyncs: number }>();

  constructor(
    private shadowManager: ShadowStateManager,
    private conflictResolver: ConflictResolver,
    private config: ISyncConfig,
  ) {}

  /**
   * Synchronize device state with cloud
   */
  async sync(deviceId: string, deviceState: IDeviceState): Promise<ISyncResult> {
    try {
      // Get or create shadow
      const shadow = await this.shadowManager.getShadow(deviceId);

      if (!shadow) {
        // First sync - create shadow with device state
        await this.shadowManager.updateReported(deviceId, deviceState.reported);
        this.updateMetrics(deviceId, true);

        return {
          deviceId,
          success: true,
          status: SyncStatus.IN_SYNC,
          changesApplied: Object.keys(deviceState.reported).length,
          conflicts: [],
          syncedAt: new Date(),
        };
      }

      // Detect conflicts
      const conflicts = this.conflictResolver.detectConflicts(deviceState, shadow);

      if (conflicts.length > 0) {
        // Store conflicts
        this.conflicts.set(deviceId, conflicts);

        // Auto-resolve if configured
        if (this.config.conflictResolution !== ConflictResolutionStrategy.MANUAL) {
          await this.autoResolveConflicts(deviceId, conflicts);
        }

        return {
          deviceId,
          success: false,
          status: SyncStatus.CONFLICT,
          changesApplied: 0,
          conflicts,
          syncedAt: new Date(),
        };
      }

      // Apply sync based on direction
      const changesApplied = await this.applySync(deviceId, deviceState, shadow);

      // Update metrics
      this.updateMetrics(deviceId, true);

      return {
        deviceId,
        success: true,
        status: SyncStatus.IN_SYNC,
        changesApplied,
        conflicts: [],
        syncedAt: new Date(),
      };
    } catch (error) {
      this.updateMetrics(deviceId, false);

      return {
        deviceId,
        success: false,
        status: SyncStatus.ERROR,
        changesApplied: 0,
        conflicts: [],
        error: (error as Error).message,
        syncedAt: new Date(),
      };
    }
  }

  /**
   * Synchronize multiple devices in batch
   */
  async syncBatch(states: IDeviceState[]): Promise<ISyncResult[]> {
    const batchSize = this.config.batchSize || 10;
    const results: ISyncResult[] = [];

    for (let i = 0; i < states.length; i += batchSize) {
      const batch = states.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((state) => this.sync(state.deviceId, state)),
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get conflicts for a device
   */
  async getConflicts(deviceId: string): Promise<IConflict[]> {
    return this.conflicts.get(deviceId) || [];
  }

  /**
   * Resolve a specific conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolutionStrategy,
    value?: any,
  ): Promise<void> {
    for (const [deviceId, conflicts] of this.conflicts.entries()) {
      const conflict = conflicts.find((c) => c.id === conflictId);

      if (conflict) {
        const resolved = this.conflictResolver.applyResolution(conflict, resolution, value);

        // Update shadow with resolved value
        await this.shadowManager.updateReported(deviceId, {
          [conflict.path]: resolved.resolution!.resolvedValue,
        });

        // Remove from conflicts
        const updatedConflicts = conflicts.filter((c) => c.id !== conflictId);
        if (updatedConflicts.length === 0) {
          this.conflicts.delete(deviceId);
        } else {
          this.conflicts.set(deviceId, updatedConflicts);
        }

        return;
      }
    }

    throw new Error(`Conflict ${conflictId} not found`);
  }

  /**
   * Apply synchronization based on direction
   */
  private async applySync(
    deviceId: string,
    deviceState: IDeviceState,
    shadow: any,
  ): Promise<number> {
    let changesApplied = 0;

    switch (this.config.direction) {
      case SyncDirection.DEVICE_TO_CLOUD:
        await this.shadowManager.updateReported(deviceId, deviceState.reported);
        changesApplied = Object.keys(deviceState.reported).length;
        break;

      case SyncDirection.CLOUD_TO_DEVICE:
        // In real implementation, this would send desired state to device
        changesApplied = Object.keys(shadow.desired).length;
        break;

      case SyncDirection.BIDIRECTIONAL:
        await this.shadowManager.updateReported(deviceId, deviceState.reported);
        changesApplied = Object.keys(deviceState.reported).length;
        break;
    }

    return changesApplied;
  }

  /**
   * Auto-resolve conflicts
   */
  private async autoResolveConflicts(_deviceId: string, conflicts: IConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      await this.resolveConflict(conflict.id, this.config.conflictResolution);
    }
  }

  /**
   * Update sync metrics
   */
  private updateMetrics(deviceId: string, success: boolean): void {
    const metrics = this.syncMetrics.get(deviceId) || {
      totalSyncs: 0,
      successfulSyncs: 0,
    };

    metrics.totalSyncs++;
    if (success) {
      metrics.successfulSyncs++;
    }

    this.syncMetrics.set(deviceId, metrics);
  }

  /**
   * Get sync metrics
   */
  getSyncMetrics(deviceId: string): {
    totalSyncs: number;
    successfulSyncs: number;
    successRate: number;
  } {
    const metrics = this.syncMetrics.get(deviceId) || {
      totalSyncs: 0,
      successfulSyncs: 0,
    };

    const successRate =
      metrics.totalSyncs > 0 ? (metrics.successfulSyncs / metrics.totalSyncs) * 100 : 0;

    return { ...metrics, successRate };
  }
}
