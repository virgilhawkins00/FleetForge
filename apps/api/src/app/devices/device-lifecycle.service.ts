/**
 * Device Lifecycle Service - Manages device state transitions
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import {
  Device,
  DeviceStatus,
  DeviceLifecycleEvent,
  DEVICE_LIFECYCLE_TRANSITIONS,
  ILifecycleHistoryEntry,
} from '@fleetforge/core';
import { DeviceRepository } from '@fleetforge/database';

export interface TransitionResult {
  device: Device;
  event: DeviceLifecycleEvent;
  previousStatus: DeviceStatus;
  newStatus: DeviceStatus;
  timestamp: Date;
}

export interface LifecycleStats {
  totalDevices: number;
  byStatus: Record<DeviceStatus, number>;
  recentTransitions: ILifecycleHistoryEntry[];
}

@Injectable()
export class DeviceLifecycleService {
  private readonly logger = new Logger(DeviceLifecycleService.name);

  constructor(private readonly deviceRepository: DeviceRepository) {}

  /**
   * Transition device to a new status with validation
   */
  async transition(
    deviceId: string,
    newStatus: DeviceStatus,
    reason?: string,
    performedBy?: string,
  ): Promise<TransitionResult> {
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }

    const previousStatus = device.status;

    if (!device.canTransitionTo(newStatus)) {
      const allowed = device.getAllowedTransitions();
      throw new BadRequestException(
        `Invalid transition from ${previousStatus} to ${newStatus}. ` +
          `Allowed transitions: ${allowed.join(', ') || 'none'}`,
      );
    }

    // Apply transition with lifecycle tracking
    device.updateStatus(newStatus, reason, performedBy);

    // Get the event from the last history entry
    const lastEntry = device.lifecycleHistory[device.lifecycleHistory.length - 1];
    const event = lastEntry?.event || DeviceLifecycleEvent.ACTIVATED;

    // Persist changes
    const updated = await this.deviceRepository.update(deviceId, {
      status: device.status,
      lifecycleTimestamps: device.lifecycleTimestamps,
      lifecycleHistory: device.lifecycleHistory,
      updatedAt: device.updatedAt,
    });

    this.logger.log(
      `Device ${deviceId} transitioned from ${previousStatus} to ${newStatus}` +
        (reason ? ` - Reason: ${reason}` : ''),
    );

    return {
      device: updated,
      event,
      previousStatus,
      newStatus,
      timestamp: new Date(),
    };
  }

  /**
   * Activate a registered device
   */
  async activate(deviceId: string, performedBy?: string): Promise<TransitionResult> {
    return this.transition(deviceId, DeviceStatus.ACTIVE, 'Device activated', performedBy);
  }

  /**
   * Suspend a device (temporary deactivation)
   */
  async suspend(
    deviceId: string,
    reason?: string,
    performedBy?: string,
  ): Promise<TransitionResult> {
    return this.transition(
      deviceId,
      DeviceStatus.SUSPENDED,
      reason || 'Device suspended',
      performedBy,
    );
  }

  /**
   * Reactivate a suspended device
   */
  async reactivate(deviceId: string, performedBy?: string): Promise<TransitionResult> {
    return this.transition(deviceId, DeviceStatus.ACTIVE, 'Device reactivated', performedBy);
  }

  /**
   * Put device in maintenance mode
   */
  async startMaintenance(
    deviceId: string,
    reason?: string,
    performedBy?: string,
  ): Promise<TransitionResult> {
    return this.transition(
      deviceId,
      DeviceStatus.MAINTENANCE,
      reason || 'Scheduled maintenance',
      performedBy,
    );
  }

  /**
   * End maintenance mode
   */
  async endMaintenance(deviceId: string, performedBy?: string): Promise<TransitionResult> {
    return this.transition(deviceId, DeviceStatus.ACTIVE, 'Maintenance completed', performedBy);
  }

  /**
   * Decommission a device permanently
   */
  async decommission(
    deviceId: string,
    reason?: string,
    performedBy?: string,
  ): Promise<TransitionResult> {
    return this.transition(
      deviceId,
      DeviceStatus.DECOMMISSIONED,
      reason || 'Device decommissioned',
      performedBy,
    );
  }

  /**
   * Mark device as errored
   */
  async markError(
    deviceId: string,
    reason: string,
    performedBy?: string,
  ): Promise<TransitionResult> {
    return this.transition(deviceId, DeviceStatus.ERROR, reason, performedBy);
  }

  /**
   * Resolve device error
   */
  async resolveError(deviceId: string, performedBy?: string): Promise<TransitionResult> {
    return this.transition(deviceId, DeviceStatus.ACTIVE, 'Error resolved', performedBy);
  }

  /**
   * Get allowed transitions for a device
   */
  async getAllowedTransitions(deviceId: string): Promise<DeviceStatus[]> {
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }
    return DEVICE_LIFECYCLE_TRANSITIONS[device.status];
  }

  /**
   * Get device lifecycle history
   */
  async getLifecycleHistory(deviceId: string): Promise<ILifecycleHistoryEntry[]> {
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }
    return device.lifecycleHistory;
  }

  /**
   * Get lifecycle statistics for a fleet
   */
  async getFleetLifecycleStats(fleetId: string): Promise<LifecycleStats> {
    const devices = await this.deviceRepository.findMany({ fleetId }, 1000, 0);

    const byStatus: Record<string, number> = {};
    const recentTransitions: ILifecycleHistoryEntry[] = [];

    for (const device of devices) {
      byStatus[device.status] = (byStatus[device.status] || 0) + 1;
      if (device.lifecycleHistory.length > 0) {
        recentTransitions.push(...device.lifecycleHistory.slice(-3));
      }
    }

    // Sort by timestamp descending and take top 20
    recentTransitions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      totalDevices: devices.length,
      byStatus: byStatus as Record<DeviceStatus, number>,
      recentTransitions: recentTransitions.slice(0, 20),
    };
  }

  /**
   * Batch transition for multiple devices
   */
  async batchTransition(
    deviceIds: string[],
    newStatus: DeviceStatus,
    reason?: string,
    performedBy?: string,
  ): Promise<{ success: TransitionResult[]; failed: Array<{ deviceId: string; error: string }> }> {
    const success: TransitionResult[] = [];
    const failed: Array<{ deviceId: string; error: string }> = [];

    for (const deviceId of deviceIds) {
      try {
        const result = await this.transition(deviceId, newStatus, reason, performedBy);
        success.push(result);
      } catch (error) {
        failed.push({
          deviceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log(
      `Batch transition completed: ${success.length} success, ${failed.length} failed`,
    );

    return { success, failed };
  }
}
