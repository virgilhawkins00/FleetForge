/**
 * Telemetry Entity - Represents device telemetry data
 */

import { ILocation } from '../value-objects';

export interface ITelemetryData {
  [key: string]: number | string | boolean | null;
}

export interface ITelemetrySensor {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
}

export class Telemetry {
  constructor(
    public readonly id: string,
    public readonly deviceId: string,
    public readonly timestamp: Date,
    public location?: ILocation,
    public data: ITelemetryData = {},
    public sensors: ITelemetrySensor[] = [],
    public batteryLevel?: number,
    public signalStrength?: number,
    public readonly receivedAt: Date = new Date(),
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.deviceId || this.deviceId.trim().length === 0) {
      throw new Error('Device ID is required');
    }

    if (this.batteryLevel !== undefined && (this.batteryLevel < 0 || this.batteryLevel > 100)) {
      throw new Error(`Invalid battery level: ${this.batteryLevel}. Must be between 0 and 100`);
    }

    if (
      this.signalStrength !== undefined &&
      (this.signalStrength < -120 || this.signalStrength > 0)
    ) {
      throw new Error(
        `Invalid signal strength: ${this.signalStrength}. Must be between -120 and 0 dBm`,
      );
    }
  }

  /**
   * Add sensor reading
   */
  addSensor(name: string, value: number, unit: string): void {
    this.sensors.push({
      name,
      value,
      unit,
      timestamp: new Date(),
    });
  }

  /**
   * Get sensor reading by name
   */
  getSensor(name: string): ITelemetrySensor | undefined {
    return this.sensors.find((s) => s.name === name);
  }

  /**
   * Check if telemetry is stale (older than 5 minutes)
   */
  isStale(): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.timestamp < fiveMinutesAgo;
  }

  /**
   * Get data latency in milliseconds
   */
  getLatency(): number {
    return this.receivedAt.getTime() - this.timestamp.getTime();
  }

  /**
   * Check if battery is low
   */
  isBatteryLow(): boolean {
    return this.batteryLevel !== undefined && this.batteryLevel < 20;
  }

  /**
   * Check if signal is weak
   */
  isSignalWeak(): boolean {
    return this.signalStrength !== undefined && this.signalStrength < -100;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      deviceId: this.deviceId,
      timestamp: this.timestamp,
      location: this.location,
      data: this.data,
      sensors: this.sensors,
      batteryLevel: this.batteryLevel,
      signalStrength: this.signalStrength,
      receivedAt: this.receivedAt,
    };
  }
}

