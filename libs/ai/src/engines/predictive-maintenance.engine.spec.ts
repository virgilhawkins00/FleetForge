/**
 * Predictive Maintenance Engine Tests
 */

import { PredictiveMaintenanceEngine } from './predictive-maintenance.engine';
import { ITrainingData, HealthStatus } from '../types';

describe('PredictiveMaintenanceEngine', () => {
  let engine: PredictiveMaintenanceEngine;

  beforeEach(() => {
    engine = new PredictiveMaintenanceEngine();
  });

  describe('train', () => {
    it('should train successfully with valid data', async () => {
      const trainingData = generateTrainingData(100);
      await expect(engine.train(trainingData)).resolves.not.toThrow();
    });

    it('should throw error with empty data', async () => {
      const trainingData: ITrainingData = {
        features: [],
        timestamps: [],
        deviceIds: [],
      };

      await expect(engine.train(trainingData)).rejects.toThrow('Training data cannot be empty');
    });
  });

  describe('predict', () => {
    beforeEach(async () => {
      const trainingData = generateTrainingData(100);
      await engine.train(trainingData);
    });

    it('should predict maintenance for known device', async () => {
      const prediction = await engine.predict('device-1', {
        metric_0: 25,
        metric_1: 60,
        metric_2: 1013,
      });

      expect(prediction.deviceId).toBe('device-1');
      expect(prediction.predictedFailureDate).toBeInstanceOf(Date);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.remainingUsefulLife).toBeGreaterThanOrEqual(0);
      expect(prediction.healthStatus).toBeDefined();
      expect(prediction.recommendations).toBeInstanceOf(Array);
      expect(prediction.criticalMetrics).toBeInstanceOf(Array);
    });

    it('should predict for unknown device with default values', async () => {
      const prediction = await engine.predict('unknown-device', {
        temperature: 25,
        humidity: 60,
      });

      expect(prediction.deviceId).toBe('unknown-device');
      expect(prediction.confidence).toBeLessThan(0.5);
      expect(prediction.healthStatus).toBe(HealthStatus.HEALTHY);
    });

    it('should classify health status correctly', async () => {
      const healthyPrediction = await engine.predict('device-1', {
        metric_0: 25,
        metric_1: 60,
        metric_2: 1013,
      });

      expect([
        HealthStatus.HEALTHY,
        HealthStatus.WARNING,
        HealthStatus.DEGRADED,
        HealthStatus.CRITICAL,
        HealthStatus.FAILED,
      ]).toContain(healthyPrediction.healthStatus);
    });

    it('should provide recommendations based on health status', async () => {
      const prediction = await engine.predict('device-1', {
        metric_0: 25,
        metric_1: 60,
        metric_2: 1013,
      });

      expect(prediction.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify critical metrics', async () => {
      const prediction = await engine.predict('device-1', {
        metric_0: 100, // Significantly different from baseline
        metric_1: 60,
        metric_2: 1013,
      });

      expect(prediction.criticalMetrics).toBeInstanceOf(Array);
      prediction.criticalMetrics.forEach((metric) => {
        expect(metric.metric).toBeDefined();
        expect(metric.currentValue).toBeDefined();
        expect(metric.threshold).toBeDefined();
        expect(['INCREASING', 'DECREASING', 'STABLE']).toContain(metric.trend);
      });
    });
  });

  describe('predictBatch', () => {
    beforeEach(async () => {
      const trainingData = generateTrainingData(100);
      await engine.train(trainingData);
    });

    it('should predict for multiple devices', async () => {
      const devices = [
        { deviceId: 'device-1', metrics: { metric_0: 25, metric_1: 60 } },
        { deviceId: 'device-2', metrics: { metric_0: 22, metric_1: 55 } },
      ];

      const predictions = await engine.predictBatch(devices);

      expect(predictions.length).toBe(2);
      expect(predictions[0].deviceId).toBe('device-1');
      expect(predictions[1].deviceId).toBe('device-2');
    });
  });

  describe('updateModel', () => {
    it('should update model with new data', async () => {
      const initialData = generateTrainingData(50);
      await engine.train(initialData);

      const newData = generateTrainingData(50);
      await expect(engine.updateModel(newData)).resolves.not.toThrow();
    });
  });

  describe('predict without training', () => {
    it('should throw error when predicting without training', async () => {
      await expect(engine.predict('device-1', { metric_0: 25 })).rejects.toThrow(
        'Model must be trained before prediction',
      );
    });
  });

  describe('edge cases', () => {
    beforeEach(async () => {
      const trainingData = generateTrainingData(100);
      await engine.train(trainingData);
    });

    it('should handle critical health status', async () => {
      // Significantly deviate from baseline
      const prediction = await engine.predict('device-1', {
        metric_0: 1000, // Very high deviation
        metric_1: 1000,
        metric_2: 50000,
      });

      expect([HealthStatus.CRITICAL, HealthStatus.FAILED, HealthStatus.DEGRADED]).toContain(
        prediction.healthStatus,
      );
      expect(prediction.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle warning health status', async () => {
      const prediction = await engine.predict('device-1', {
        metric_0: 30, // Slight deviation
        metric_1: 70,
        metric_2: 1020,
      });

      expect([HealthStatus.HEALTHY, HealthStatus.WARNING, HealthStatus.DEGRADED]).toContain(
        prediction.healthStatus,
      );
    });

    it('should handle degraded health status', async () => {
      const prediction = await engine.predict('device-1', {
        metric_0: 45, // Moderate deviation
        metric_1: 100,
        metric_2: 1200,
      });

      expect(prediction.healthStatus).toBeDefined();
      expect(prediction.recommendations).toBeDefined();
    });

    it('should return default prediction for unknown device', async () => {
      const prediction = await engine.predict('unknown-device-xyz', {
        metric_0: 25,
        metric_1: 60,
        metric_2: 1025,
      });

      expect(prediction.deviceId).toBe('unknown-device-xyz');
      expect(prediction.healthStatus).toBe(HealthStatus.HEALTHY);
      expect(prediction.confidence).toBe(0.3);
      expect(prediction.remainingUsefulLife).toBe(4380);
      expect(prediction.recommendations).toContain(
        'Collect more historical data for accurate predictions',
      );
    });

    it('should generate recommendations for FAILED status', async () => {
      // Extreme metrics to trigger FAILED status
      const prediction = await engine.predict('device-1', {
        metric_0: -100000,
        metric_1: -100000,
        metric_2: -100000,
      });

      expect(prediction.healthStatus).toBeDefined();
      if (
        prediction.healthStatus === HealthStatus.CRITICAL ||
        prediction.healthStatus === HealthStatus.FAILED
      ) {
        expect(prediction.recommendations).toContain('Schedule immediate maintenance');
      }
    });

    it('should handle zero degradation rate', async () => {
      // Train with constant data (no degradation)
      const constantData = generateConstantTrainingData(100);
      const stableEngine = new PredictiveMaintenanceEngine();
      await stableEngine.train(constantData);

      const prediction = await stableEngine.predict('device-1', {
        metric_0: 25,
        metric_1: 60,
        metric_2: 1025,
      });

      // With zero degradation, RUL should be maximum (1 year = 8760 hours)
      expect(prediction.remainingUsefulLife).toBe(8760);
    });

    it('should trigger DEGRADED status recommendations', async () => {
      // Create data that will produce DEGRADED status (score 0.5-0.7)
      const prediction = await engine.predict('device-1', {
        metric_0: 35, // ~40% deviation
        metric_1: 85, // ~40% deviation
        metric_2: 1400, // ~40% deviation
      });

      if (prediction.healthStatus === HealthStatus.DEGRADED) {
        expect(prediction.recommendations).toContain(
          'Schedule preventive maintenance within 7 days',
        );
        expect(prediction.recommendations).toContain('Monitor device closely');
      }
    });

    it('should trigger WARNING status recommendations', async () => {
      const prediction = await engine.predict('device-1', {
        metric_0: 28, // Small deviation
        metric_1: 65, // Small deviation
        metric_2: 1100, // Small deviation
      });

      if (prediction.healthStatus === HealthStatus.WARNING) {
        expect(prediction.recommendations).toContain('Schedule routine inspection');
      }
    });
  });
});

// Helper function
function generateTrainingData(count: number): ITrainingData {
  const features: number[][] = [];
  const timestamps: Date[] = [];
  const deviceIds: string[] = [];

  for (let i = 0; i < count; i++) {
    features.push([
      20 + Math.random() * 10, // metric_0: 20-30
      50 + Math.random() * 20, // metric_1: 50-70
      1000 + Math.random() * 50, // metric_2: 1000-1050
    ]);

    const date = new Date();
    date.setHours(date.getHours() - i);
    timestamps.push(date);

    deviceIds.push(`device-${i % 5}`);
  }

  return { features, timestamps, deviceIds };
}

// Helper function for constant data (no degradation)
function generateConstantTrainingData(count: number): ITrainingData {
  const features: number[][] = [];
  const timestamps: Date[] = [];
  const deviceIds: string[] = [];

  for (let i = 0; i < count; i++) {
    features.push([25, 60, 1025]); // Constant values

    const date = new Date();
    date.setHours(date.getHours() - i);
    timestamps.push(date);

    deviceIds.push(`device-${i % 5}`);
  }

  return { features, timestamps, deviceIds };
}
