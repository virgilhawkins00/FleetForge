/**
 * Anomaly Detection Service Interface (Port)
 * AI-powered predictive maintenance
 */

import { Telemetry } from '../../entities';

export interface IAnomaly {
  deviceId: string;
  type: 'BATTERY_DRAIN' | 'SIGNAL_LOSS' | 'SENSOR_FAILURE' | 'UNUSUAL_PATTERN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0-1
  description: string;
  detectedAt: Date;
  telemetryId: string;
}

export interface IAnomalyDetectionService {
  /**
   * Analyze telemetry for anomalies
   */
  detectAnomalies(telemetry: Telemetry): Promise<IAnomaly[]>;

  /**
   * Train model with historical data
   */
  trainModel(deviceId: string, historicalData: Telemetry[]): Promise<void>;

  /**
   * Get anomaly history for device
   */
  getAnomalyHistory(deviceId: string, days: number): Promise<IAnomaly[]>;

  /**
   * Get devices at risk
   */
  getDevicesAtRisk(threshold: number): Promise<string[]>;
}

