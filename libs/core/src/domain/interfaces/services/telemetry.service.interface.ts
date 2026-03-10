/**
 * Telemetry Service Interface (Port)
 */

import { Telemetry } from '../../entities';

export interface ITelemetryAggregation {
  deviceId: string;
  metric: string;
  min: number;
  max: number;
  avg: number;
  count: number;
  period: string;
}

export interface ITelemetryService {
  /**
   * Process incoming telemetry data
   */
  processTelemetry(telemetry: Telemetry): Promise<void>;

  /**
   * Get telemetry history for device
   */
  getDeviceHistory(
    deviceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Telemetry[]>;

  /**
   * Get aggregated telemetry data
   */
  getAggregatedData(
    deviceId: string,
    metric: string,
    period: 'hour' | 'day' | 'week' | 'month',
  ): Promise<ITelemetryAggregation[]>;

  /**
   * Get latest telemetry for device
   */
  getLatest(deviceId: string): Promise<Telemetry | null>;

  /**
   * Cleanup old telemetry data
   */
  cleanupOldData(retentionDays: number): Promise<number>;
}

