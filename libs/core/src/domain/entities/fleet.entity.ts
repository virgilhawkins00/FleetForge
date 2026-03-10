/**
 * Fleet Entity - Represents a group of devices
 */

export interface IFleetMetadata {
  description?: string;
  region?: string;
  timezone?: string;
  customFields?: Record<string, unknown>;
}

export interface IFleetStatistics {
  totalDevices: number;
  activeDevices: number;
  offlineDevices: number;
  errorDevices: number;
  averageBatteryLevel?: number;
  lastUpdated: Date;
}

export class Fleet {
  constructor(
    public readonly id: string,
    public name: string,
    public readonly organizationId: string,
    public metadata: IFleetMetadata,
    public deviceIds: string[] = [],
    public tags: string[] = [],
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public statistics?: IFleetStatistics,
  ) {}

  /**
   * Add device to fleet
   */
  addDevice(deviceId: string): void {
    if (!this.deviceIds.includes(deviceId)) {
      this.deviceIds.push(deviceId);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove device from fleet
   */
  removeDevice(deviceId: string): void {
    const index = this.deviceIds.indexOf(deviceId);
    if (index > -1) {
      this.deviceIds.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  /**
   * Add tag to fleet
   */
  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove tag from fleet
   */
  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  /**
   * Update fleet statistics
   */
  updateStatistics(statistics: IFleetStatistics): void {
    this.statistics = {
      ...statistics,
      lastUpdated: new Date(),
    };
    this.updatedAt = new Date();
  }

  /**
   * Get fleet health percentage
   */
  getHealthPercentage(): number {
    if (!this.statistics || this.statistics.totalDevices === 0) {
      return 100;
    }

    return (this.statistics.activeDevices / this.statistics.totalDevices) * 100;
  }

  /**
   * Check if fleet is healthy (>80% devices active)
   */
  isHealthy(): boolean {
    return this.getHealthPercentage() >= 80;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      organizationId: this.organizationId,
      metadata: this.metadata,
      deviceIds: this.deviceIds,
      tags: this.tags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      statistics: this.statistics,
    };
  }
}

