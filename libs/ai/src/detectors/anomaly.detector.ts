/**
 * Anomaly Detector
 * Uses Isolation Forest for real-time anomaly detection
 */

import { v4 as uuidv4 } from 'uuid';
import { IsolationForest } from '../algorithms/isolation-forest';
import {
  IAnomalyDetector,
  ITelemetryData,
  IAnomalyDetectionResult,
  IAnomaly,
  ITrainingData,
  IModelMetrics,
  IFeatureImportance,
  AnomalyType,
  AnomalySeverity,
  IIsolationForestConfig,
} from '../types';

export class AnomalyDetector implements IAnomalyDetector {
  private model: IsolationForest;
  private featureNames: string[] = [];
  private metrics: IModelMetrics = {
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1Score: 0,
    truePositives: 0,
    falsePositives: 0,
    trueNegatives: 0,
    falseNegatives: 0,
  };

  constructor(config?: Partial<IIsolationForestConfig>) {
    this.model = new IsolationForest(config);
  }

  /**
   * Train the anomaly detection model
   */
  async train(data: ITrainingData): Promise<void> {
    if (data.features.length === 0) {
      throw new Error('Training data cannot be empty');
    }

    // Store feature names
    this.featureNames = Object.keys(data.features[0] || {});

    // Train isolation forest
    this.model.train(data.features);

    // Calculate metrics if labels are provided
    if (data.labels) {
      this.calculateMetrics(data.features, data.labels);
    }
  }

  /**
   * Detect anomalies in telemetry data
   */
  async detect(telemetry: ITelemetryData): Promise<IAnomalyDetectionResult> {
    const features = this.extractFeatures(telemetry.metrics);
    const score = this.model.score(features);
    const isAnomaly = this.model.predict(features);

    const anomalies: IAnomaly[] = [];

    if (isAnomaly) {
      const anomaly: IAnomaly = {
        id: uuidv4(),
        deviceId: telemetry.deviceId,
        type: this.classifyAnomalyType(telemetry.metrics, score),
        severity: this.calculateSeverity(score),
        score,
        detectedAt: telemetry.timestamp,
        metrics: telemetry.metrics,
        description: this.generateDescription(telemetry.metrics, score),
        resolved: false,
      };

      anomalies.push(anomaly);
    }

    return {
      deviceId: telemetry.deviceId,
      isAnomaly,
      score,
      anomalies,
      timestamp: new Date(),
    };
  }

  /**
   * Detect anomalies in batch
   */
  async detectBatch(telemetry: ITelemetryData[]): Promise<IAnomalyDetectionResult[]> {
    return Promise.all(telemetry.map((t) => this.detect(t)));
  }

  /**
   * Get model metrics
   */
  getModelMetrics(): IModelMetrics {
    return { ...this.metrics };
  }

  /**
   * Get feature importance (simplified version)
   */
  getFeatureImportance(): IFeatureImportance[] {
    // In a real implementation, this would calculate actual feature importance
    // For now, return equal importance
    return this.featureNames.map((feature, index) => ({
      feature,
      importance: 1 / this.featureNames.length,
      rank: index + 1,
    }));
  }

  /**
   * Extract features from metrics
   */
  private extractFeatures(metrics: Record<string, number>): number[] {
    return Object.values(metrics);
  }

  /**
   * Classify anomaly type based on metrics
   */
  private classifyAnomalyType(_metrics: Record<string, number>, score: number): AnomalyType {
    // Simple heuristic - can be improved with more sophisticated logic
    if (score > 0.8) {
      return AnomalyType.STATISTICAL;
    } else if (score > 0.6) {
      return AnomalyType.BEHAVIORAL;
    } else {
      return AnomalyType.TEMPORAL;
    }
  }

  /**
   * Calculate severity based on anomaly score
   */
  private calculateSeverity(score: number): AnomalySeverity {
    if (score >= 0.9) return AnomalySeverity.CRITICAL;
    if (score >= 0.75) return AnomalySeverity.HIGH;
    if (score >= 0.6) return AnomalySeverity.MEDIUM;
    return AnomalySeverity.LOW;
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(metrics: Record<string, number>, score: number): string {
    const severity = this.calculateSeverity(score);
    const metricNames = Object.keys(metrics).join(', ');
    return `${severity} anomaly detected in metrics: ${metricNames} (score: ${score.toFixed(3)})`;
  }

  /**
   * Calculate model metrics
   */
  private calculateMetrics(features: number[][], labels: number[]): void {
    const predictions = this.model.predictBatch(features);

    let tp = 0,
      fp = 0,
      tn = 0,
      fn = 0;

    for (let i = 0; i < predictions.length; i++) {
      const predicted = predictions[i];
      const actual = labels[i] === 1;

      if (predicted && actual) tp++;
      else if (predicted && !actual) fp++;
      else if (!predicted && !actual) tn++;
      else fn++;
    }

    const accuracy = (tp + tn) / (tp + tn + fp + fn);
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = (2 * (precision * recall)) / (precision + recall) || 0;

    this.metrics = {
      accuracy,
      precision,
      recall,
      f1Score,
      truePositives: tp,
      falsePositives: fp,
      trueNegatives: tn,
      falseNegatives: fn,
    };
  }
}
