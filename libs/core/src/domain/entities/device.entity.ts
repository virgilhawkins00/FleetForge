/**
 * Device Entity - Core domain model for IoT devices
 * Implements Domain-Driven Design principles
 */

import {
  DeviceStatus,
  DeviceType,
  DeviceLifecycleEvent,
  DEVICE_LIFECYCLE_TRANSITIONS,
} from '../enums';
import { ILocation } from '../value-objects';

export interface IDeviceMetadata {
  manufacturer: string;
  model: string;
  hardwareVersion: string;
  serialNumber: string;
  manufactureDate?: Date;
}

export interface IDeviceCapabilities {
  hasGPS: boolean;
  hasCamera: boolean;
  hasCellular: boolean;
  hasWiFi: boolean;
  hasBluetooth: boolean;
  sensors: string[];
}

export interface IDeviceHealth {
  batteryLevel?: number;
  signalStrength?: number;
  temperature?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  lastHealthCheck: Date;
}

export interface IDeviceLifecycleTimestamps {
  provisionedAt?: Date;
  registeredAt?: Date;
  activatedAt?: Date;
  suspendedAt?: Date;
  decommissionedAt?: Date;
}

export interface ILifecycleHistoryEntry {
  event: DeviceLifecycleEvent;
  fromStatus: DeviceStatus;
  toStatus: DeviceStatus;
  timestamp: Date;
  reason?: string;
  performedBy?: string;
}

export class Device {
  public lifecycleTimestamps: IDeviceLifecycleTimestamps;
  public lifecycleHistory: ILifecycleHistoryEntry[];

  constructor(
    public readonly id: string,
    public readonly fleetId: string,
    public name: string,
    public type: DeviceType,
    public status: DeviceStatus,
    public metadata: IDeviceMetadata,
    public capabilities: IDeviceCapabilities,
    public firmwareVersion: string,
    public lastSeen: Date,
    public location?: ILocation,
    public health?: IDeviceHealth,
    public tags: string[] = [],
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    lifecycleTimestamps?: IDeviceLifecycleTimestamps,
    lifecycleHistory?: ILifecycleHistoryEntry[],
  ) {
    this.lifecycleTimestamps = lifecycleTimestamps || {};
    this.lifecycleHistory = lifecycleHistory || [];
  }

  /**
   * Check if transition to new status is valid
   */
  canTransitionTo(newStatus: DeviceStatus): boolean {
    const allowedTransitions = DEVICE_LIFECYCLE_TRANSITIONS[this.status];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Get allowed transitions from current status
   */
  getAllowedTransitions(): DeviceStatus[] {
    return DEVICE_LIFECYCLE_TRANSITIONS[this.status];
  }

  /**
   * Update device status with validation and lifecycle tracking
   */
  updateStatus(newStatus: DeviceStatus, reason?: string, performedBy?: string): void {
    if (this.status === DeviceStatus.DECOMMISSIONED) {
      throw new Error('Cannot update status of decommissioned device');
    }

    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid status transition from ${this.status} to ${newStatus}. ` +
          `Allowed: ${this.getAllowedTransitions().join(', ')}`,
      );
    }

    const event = this.determineLifecycleEvent(this.status, newStatus);
    const historyEntry: ILifecycleHistoryEntry = {
      event,
      fromStatus: this.status,
      toStatus: newStatus,
      timestamp: new Date(),
      reason,
      performedBy,
    };

    this.lifecycleHistory.push(historyEntry);
    this.updateLifecycleTimestamp(newStatus);
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  /**
   * Determine lifecycle event based on state transition
   */
  private determineLifecycleEvent(from: DeviceStatus, to: DeviceStatus): DeviceLifecycleEvent {
    if (to === DeviceStatus.PROVISIONING) return DeviceLifecycleEvent.PROVISIONED;
    if (to === DeviceStatus.REGISTERED) return DeviceLifecycleEvent.REGISTERED;
    if (to === DeviceStatus.ACTIVE && from === DeviceStatus.REGISTERED)
      return DeviceLifecycleEvent.ACTIVATED;
    if (to === DeviceStatus.ACTIVE && from === DeviceStatus.OFFLINE)
      return DeviceLifecycleEvent.CAME_ONLINE;
    if (to === DeviceStatus.ACTIVE && from === DeviceStatus.SUSPENDED)
      return DeviceLifecycleEvent.REACTIVATED;
    if (to === DeviceStatus.ACTIVE && from === DeviceStatus.MAINTENANCE)
      return DeviceLifecycleEvent.MAINTENANCE_COMPLETED;
    if (to === DeviceStatus.ACTIVE && from === DeviceStatus.UPDATING)
      return DeviceLifecycleEvent.UPDATE_COMPLETED;
    if (to === DeviceStatus.ACTIVE && from === DeviceStatus.ERROR)
      return DeviceLifecycleEvent.ERROR_RESOLVED;
    if (to === DeviceStatus.OFFLINE) return DeviceLifecycleEvent.WENT_OFFLINE;
    if (to === DeviceStatus.UPDATING) return DeviceLifecycleEvent.UPDATE_STARTED;
    if (to === DeviceStatus.MAINTENANCE) return DeviceLifecycleEvent.MAINTENANCE_STARTED;
    if (to === DeviceStatus.ERROR) return DeviceLifecycleEvent.ERROR_OCCURRED;
    if (to === DeviceStatus.SUSPENDED) return DeviceLifecycleEvent.SUSPENDED;
    if (to === DeviceStatus.DECOMMISSIONED) return DeviceLifecycleEvent.DECOMMISSIONED;
    return DeviceLifecycleEvent.ACTIVATED; // fallback
  }

  /**
   * Update lifecycle timestamp based on new status
   */
  private updateLifecycleTimestamp(newStatus: DeviceStatus): void {
    const now = new Date();
    switch (newStatus) {
      case DeviceStatus.PROVISIONING:
        this.lifecycleTimestamps.provisionedAt = now;
        break;
      case DeviceStatus.REGISTERED:
        this.lifecycleTimestamps.registeredAt = now;
        break;
      case DeviceStatus.ACTIVE:
        if (!this.lifecycleTimestamps.activatedAt) {
          this.lifecycleTimestamps.activatedAt = now;
        }
        break;
      case DeviceStatus.SUSPENDED:
        this.lifecycleTimestamps.suspendedAt = now;
        break;
      case DeviceStatus.DECOMMISSIONED:
        this.lifecycleTimestamps.decommissionedAt = now;
        break;
    }
  }

  /**
   * Update firmware version
   */
  updateFirmware(version: string): void {
    if (this.status === DeviceStatus.UPDATING) {
      throw new Error('Device is already updating');
    }
    this.firmwareVersion = version;
    this.updatedAt = new Date();
  }

  /**
   * Update device location
   */
  updateLocation(location: ILocation): void {
    this.location = location;
    this.lastSeen = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Update device health metrics
   */
  updateHealth(health: Partial<IDeviceHealth>): void {
    this.health = {
      ...this.health,
      ...health,
      lastHealthCheck: new Date(),
    } as IDeviceHealth;
    this.lastSeen = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Check if device is online (seen in last 5 minutes)
   */
  isOnline(): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastSeen > fiveMinutesAgo && this.status === DeviceStatus.ACTIVE;
  }

  /**
   * Check if device needs firmware update
   */
  needsUpdate(latestVersion: string): boolean {
    return this.firmwareVersion !== latestVersion && this.status === DeviceStatus.ACTIVE;
  }

  /**
   * Validate device health
   */
  isHealthy(): boolean {
    if (!this.health) return true;

    const { batteryLevel, temperature, memoryUsage, cpuUsage } = this.health;

    if (batteryLevel !== undefined && batteryLevel < 10) return false;
    if (temperature !== undefined && (temperature < -20 || temperature > 80)) return false;
    if (memoryUsage !== undefined && memoryUsage > 90) return false;
    if (cpuUsage !== undefined && cpuUsage > 95) return false;

    return true;
  }

  /**
   * Add tag to device
   */
  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove tag from device
   */
  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      fleetId: this.fleetId,
      name: this.name,
      type: this.type,
      status: this.status,
      metadata: this.metadata,
      capabilities: this.capabilities,
      firmwareVersion: this.firmwareVersion,
      lastSeen: this.lastSeen,
      location: this.location,
      health: this.health,
      tags: this.tags,
      lifecycleTimestamps: this.lifecycleTimestamps,
      lifecycleHistory: this.lifecycleHistory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
