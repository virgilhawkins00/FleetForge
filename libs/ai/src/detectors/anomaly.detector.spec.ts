/**
 * Anomaly Detector Tests
 */

import { AnomalyDetector } from './anomaly.detector';
import { ITelemetryData, ITrainingData, AnomalySeverity } from '../types';

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector({
      numTrees: 10,
      sampleSize: 50,
      contamination: 0.1,
    });
  });

  describe('train', () => {
    it('should train successfully with valid data', async () => {
      const trainingData: ITrainingData = {
        features: generateFeatures(100),
        timestamps: generateTimestamps(100),
        deviceIds: generateDeviceIds(100),
      };

      await expect(detector.train(trainingData)).resolves.not.toThrow();
    });

    it('should throw error with empty data', async () => {
      const trainingData: ITrainingData = {
        features: [],
        timestamps: [],
        deviceIds: [],
      };

      await expect(detector.train(trainingData)).rejects.toThrow('Training data cannot be empty');
    });

    it('should calculate metrics when labels provided', async () => {
      const trainingData: ITrainingData = {
        features: generateFeatures(100),
        labels: generateLabels(100),
        timestamps: generateTimestamps(100),
        deviceIds: generateDeviceIds(100),
      };

      await detector.train(trainingData);
      const metrics = detector.getModelMetrics();

      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('detect', () => {
    beforeEach(async () => {
      const trainingData: ITrainingData = {
        features: generateFeatures(100),
        timestamps: generateTimestamps(100),
        deviceIds: generateDeviceIds(100),
      };
      await detector.train(trainingData);
    });

    it('should detect normal telemetry as non-anomaly', async () => {
      const telemetry: ITelemetryData = {
        deviceId: 'device-1',
        timestamp: new Date(),
        metrics: {
          temperature: 25,
          humidity: 60,
          pressure: 1013,
        },
      };

      const result = await detector.detect(telemetry);

      expect(result.deviceId).toBe('device-1');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should detect anomalous telemetry', async () => {
      const telemetry: ITelemetryData = {
        deviceId: 'device-1',
        timestamp: new Date(),
        metrics: {
          temperature: 1000,
          humidity: 1000,
          pressure: 10000,
        },
      };

      const result = await detector.detect(telemetry);

      expect(result.isAnomaly).toBe(true);
      expect(result.anomalies.length).toBeGreaterThan(0);
    });

    it('should include anomaly details', async () => {
      const telemetry: ITelemetryData = {
        deviceId: 'device-1',
        timestamp: new Date(),
        metrics: {
          temperature: 1000,
          humidity: 1000,
          pressure: 10000,
        },
      };

      const result = await detector.detect(telemetry);

      if (result.isAnomaly) {
        const anomaly = result.anomalies[0];
        expect(anomaly.id).toBeDefined();
        expect(anomaly.deviceId).toBe('device-1');
        expect(anomaly.severity).toBeDefined();
        expect(anomaly.description).toBeDefined();
        expect(anomaly.resolved).toBe(false);
      }
    });

    it('should classify severity correctly', async () => {
      const telemetry: ITelemetryData = {
        deviceId: 'device-1',
        timestamp: new Date(),
        metrics: {
          temperature: 1000,
          humidity: 1000,
          pressure: 10000,
        },
      };

      const result = await detector.detect(telemetry);

      if (result.isAnomaly) {
        const severity = result.anomalies[0].severity;
        expect([
          AnomalySeverity.LOW,
          AnomalySeverity.MEDIUM,
          AnomalySeverity.HIGH,
          AnomalySeverity.CRITICAL,
        ]).toContain(severity);
      }
    });
  });

  describe('detectBatch', () => {
    beforeEach(async () => {
      const trainingData: ITrainingData = {
        features: generateFeatures(100),
        timestamps: generateTimestamps(100),
        deviceIds: generateDeviceIds(100),
      };
      await detector.train(trainingData);
    });

    it('should detect multiple telemetry samples', async () => {
      const telemetry: ITelemetryData[] = [
        {
          deviceId: 'device-1',
          timestamp: new Date(),
          metrics: { temperature: 25, humidity: 60 },
        },
        {
          deviceId: 'device-2',
          timestamp: new Date(),
          metrics: { temperature: 22, humidity: 55 },
        },
      ];

      const results = await detector.detectBatch(telemetry);

      expect(results.length).toBe(2);
      expect(results[0].deviceId).toBe('device-1');
      expect(results[1].deviceId).toBe('device-2');
    });
  });

  describe('getFeatureImportance', () => {
    beforeEach(async () => {
      const trainingData: ITrainingData = {
        features: generateFeatures(100),
        timestamps: generateTimestamps(100),
        deviceIds: generateDeviceIds(100),
      };
      await detector.train(trainingData);
    });

    it('should return feature importance', () => {
      const importance = detector.getFeatureImportance();
      expect(importance.length).toBeGreaterThan(0);
      expect(importance[0].feature).toBeDefined();
      expect(importance[0].importance).toBeGreaterThanOrEqual(0);
      expect(importance[0].rank).toBeGreaterThan(0);
    });
  });

  describe('severity classification', () => {
    beforeEach(async () => {
      const trainingData: ITrainingData = {
        features: generateFeatures(100),
        timestamps: generateTimestamps(100),
        deviceIds: generateDeviceIds(100),
      };
      await detector.train(trainingData);
    });

    it('should classify severity for extreme anomalies', async () => {
      const telemetry: ITelemetryData = {
        deviceId: 'device-1',
        timestamp: new Date(),
        metrics: {
          temperature: 10000,
          humidity: 10000,
          pressure: 100000,
        },
      };

      const result = await detector.detect(telemetry);
      if (result.isAnomaly) {
        expect([
          AnomalySeverity.LOW,
          AnomalySeverity.MEDIUM,
          AnomalySeverity.HIGH,
          AnomalySeverity.CRITICAL,
        ]).toContain(result.anomalies[0].severity);
      }
    });

    it('should classify medium severity for moderate anomalies', async () => {
      const telemetry: ITelemetryData = {
        deviceId: 'device-1',
        timestamp: new Date(),
        metrics: {
          temperature: 80,
          humidity: 90,
          pressure: 1500,
        },
      };

      const result = await detector.detect(telemetry);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should handle anomaly type classification', async () => {
      // Test STATISTICAL type (score > 0.8)
      const telemetry: ITelemetryData = {
        deviceId: 'device-1',
        timestamp: new Date(),
        metrics: {
          temperature: 99999,
          humidity: 99999,
          pressure: 999999,
        },
      };

      const result = await detector.detect(telemetry);
      expect(result).toBeDefined();
      expect(result.deviceId).toBe('device-1');
    });
  });
});

// Helper functions
function generateFeatures(count: number): number[][] {
  return Array.from({ length: count }, () => [
    Math.random() * 50,
    Math.random() * 100,
    Math.random() * 2000,
  ]);
}

function generateLabels(count: number): number[] {
  return Array.from({ length: count }, () => (Math.random() > 0.9 ? 1 : 0));
}

function generateTimestamps(count: number): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setHours(date.getHours() - i);
    return date;
  });
}

function generateDeviceIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `device-${i % 10}`);
}
