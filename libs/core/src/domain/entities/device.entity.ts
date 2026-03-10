/**
 * Device Entity - Core domain model for IoT devices
 * Implements Domain-Driven Design principles
 */

import { DeviceStatus, DeviceType } from '../enums';
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

export class Device {
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
  ) {}

  /**
   * Update device status with validation
   */
  updateStatus(newStatus: DeviceStatus): void {
    if (this.status === DeviceStatus.DECOMMISSIONED) {
      throw new Error('Cannot update status of decommissioned device');
    }
    this.status = newStatus;
    this.updatedAt = new Date();
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
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

