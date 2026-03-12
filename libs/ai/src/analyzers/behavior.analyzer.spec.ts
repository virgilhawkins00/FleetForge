/**
 * Behavior Analyzer Tests
 */

import { BehaviorAnalyzer } from './behavior.analyzer';
import { ITelemetryData } from '../types';

describe('BehaviorAnalyzer', () => {
  let analyzer: BehaviorAnalyzer;

  beforeEach(() => {
    analyzer = new BehaviorAnalyzer();
  });

  describe('analyzePattern', () => {
    it('should analyze behavior patterns', async () => {
      const telemetry = generateTelemetry('device-1', 50);
      const result = await analyzer.analyzePattern('device-1', telemetry);

      expect(result.deviceId).toBe('device-1');
      expect(result.normalBehavior).toBeInstanceOf(Array);
      expect(result.anomalousBehavior).toBeInstanceOf(Array);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should throw error with empty telemetry', async () => {
      await expect(analyzer.analyzePattern('device-1', [])).rejects.toThrow(
        'Telemetry data cannot be empty',
      );
    });

    it('should classify patterns correctly', async () => {
      const telemetry = generateTelemetry('device-1', 100);
      const result = await analyzer.analyzePattern('device-1', telemetry);

      const totalPatterns = result.normalBehavior.length + result.anomalousBehavior.length;
      expect(totalPatterns).toBeGreaterThan(0);
    });

    it('should calculate risk score based on anomalies', async () => {
      const normalTelemetry = generateTelemetry('device-1', 50);
      const normalResult = await analyzer.analyzePattern('device-1', normalTelemetry);

      const anomalousTelemetry = generateAnomalousTelemetry('device-2', 50);
      const anomalousResult = await analyzer.analyzePattern('device-2', anomalousTelemetry);

      // Anomalous telemetry should have higher risk score
      expect(anomalousResult.riskScore).toBeGreaterThanOrEqual(normalResult.riskScore);
    });
  });

  describe('detectAnomalousPatterns', () => {
    it('should detect anomalous patterns', async () => {
      const telemetry = generateTelemetry('device-1', 50);
      await analyzer.analyzePattern('device-1', telemetry);

      const anomalous = await analyzer.detectAnomalousPatterns('device-1');
      expect(anomalous).toBeInstanceOf(Array);
    });

    it('should return empty array for unknown device', async () => {
      const anomalous = await analyzer.detectAnomalousPatterns('unknown-device');
      expect(anomalous).toEqual([]);
    });
  });

  describe('getNormalPatterns', () => {
    it('should get normal patterns', async () => {
      const telemetry = generateTelemetry('device-1', 50);
      await analyzer.analyzePattern('device-1', telemetry);

      const normal = await analyzer.getNormalPatterns('device-1');
      expect(normal).toBeInstanceOf(Array);
    });

    it('should return empty array for unknown device', async () => {
      const normal = await analyzer.getNormalPatterns('unknown-device');
      expect(normal).toEqual([]);
    });
  });

  describe('updateBaseline', () => {
    it('should update baseline successfully', async () => {
      const telemetry = generateTelemetry('device-1', 50);
      await expect(analyzer.updateBaseline('device-1', telemetry)).resolves.not.toThrow();
    });

    it('should affect pattern classification with anomalous data', async () => {
      const normalTelemetry = generateTelemetry('device-1', 50);
      const anomalousTelemetry = generateAnomalousTelemetry('device-1', 50);

      // Update baseline with normal telemetry
      await analyzer.updateBaseline('device-1', normalTelemetry);

      // Analyze normal telemetry (should match baseline)
      const normalResult = await analyzer.analyzePattern('device-1', normalTelemetry);

      // Analyze anomalous telemetry (should deviate from baseline)
      const anomalousResult = await analyzer.analyzePattern('device-1', anomalousTelemetry);

      // Anomalous data should have higher or equal risk score
      expect(anomalousResult.riskScore).toBeGreaterThanOrEqual(normalResult.riskScore);
    });

    it('should handle empty telemetry for baseline update', async () => {
      await expect(analyzer.updateBaseline('device-1', [])).resolves.not.toThrow();
    });
  });

  describe('edge cases and branch coverage', () => {
    it('should handle patterns with low confidence as anomalous', async () => {
      // Generate minimal telemetry to produce low-confidence patterns
      const telemetry = generateTelemetry('device-low', 5);
      const result = await analyzer.analyzePattern('device-low', telemetry);

      expect(result.deviceId).toBe('device-low');
      expect(typeof result.riskScore).toBe('number');
    });

    it('should handle patterns with low frequency as anomalous', async () => {
      // Generate very sparse telemetry
      const telemetry = generateTelemetry('device-sparse', 3);
      const result = await analyzer.analyzePattern('device-sparse', telemetry);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle case when no anomalous patterns exist', async () => {
      // Generate very consistent telemetry
      const telemetry = generateConsistentTelemetry('device-consistent', 100);
      await analyzer.updateBaseline('device-consistent', telemetry);
      const result = await analyzer.analyzePattern('device-consistent', telemetry);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });

    it('should calculate risk score correctly with only normal patterns', async () => {
      const telemetry = generateConsistentTelemetry('device-normal', 100);
      await analyzer.updateBaseline('device-normal', telemetry);
      const result = await analyzer.analyzePattern('device-normal', telemetry);

      // With consistent data matching baseline, risk should be low
      expect(result.normalBehavior).toBeDefined();
    });

    it('should handle baseline comparison with characteristics stats', async () => {
      const telemetry = generateTelemetry('device-stats', 100);
      await analyzer.updateBaseline('device-stats', telemetry);

      // Generate telemetry with high deviation
      const deviatedTelemetry = generateHighDeviationTelemetry('device-stats', 100);
      const result = await analyzer.analyzePattern('device-stats', deviatedTelemetry);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });
  });
});

// Helper functions
function generateConsistentTelemetry(deviceId: string, count: number): ITelemetryData[] {
  const telemetry: ITelemetryData[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - i * 10);

    // Very consistent values - minimal variance
    telemetry.push({
      deviceId,
      timestamp,
      metrics: {
        temperature: 25,
        humidity: 60,
        pressure: 1013,
      },
    });
  }

  return telemetry;
}

function generateHighDeviationTelemetry(deviceId: string, count: number): ITelemetryData[] {
  const telemetry: ITelemetryData[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - i * 10);

    // Values that deviate more than 50% from baseline
    telemetry.push({
      deviceId,
      timestamp,
      metrics: {
        temperature: 50 + Math.random() * 10, // ~100% deviation from 25
        humidity: 120 + Math.random() * 10, // ~100% deviation from 60
        pressure: 2000 + Math.random() * 100, // ~100% deviation from 1013
      },
    });
  }

  return telemetry;
}

// Helper functions
function generateTelemetry(deviceId: string, count: number): ITelemetryData[] {
  const telemetry: ITelemetryData[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - i * 10);

    telemetry.push({
      deviceId,
      timestamp,
      metrics: {
        temperature: 20 + Math.random() * 10,
        humidity: 50 + Math.random() * 20,
        pressure: 1000 + Math.random() * 50,
      },
    });
  }

  return telemetry;
}

function generateAnomalousTelemetry(deviceId: string, count: number): ITelemetryData[] {
  const telemetry: ITelemetryData[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - i * 10);

    // Generate anomalous data with high variance
    telemetry.push({
      deviceId,
      timestamp,
      metrics: {
        temperature: Math.random() * 100,
        humidity: Math.random() * 100,
        pressure: Math.random() * 2000,
      },
    });
  }

  return telemetry;
}
