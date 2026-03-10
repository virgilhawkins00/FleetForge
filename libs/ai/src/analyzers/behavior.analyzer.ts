/**
 * Behavior Analyzer
 * Analyzes device and driver behavior patterns
 */

import {
  IBehaviorAnalyzer,
  ITelemetryData,
  IBehaviorAnalysisResult,
  IBehaviorPattern,
} from '../types';

export class BehaviorAnalyzer implements IBehaviorAnalyzer {
  private devicePatterns = new Map<string, IBehaviorPattern[]>();
  private deviceBaselines = new Map<string, Map<string, number>>();

  /**
   * Analyze behavior patterns for a device
   */
  async analyzePattern(
    deviceId: string,
    telemetry: ITelemetryData[],
  ): Promise<IBehaviorAnalysisResult> {
    if (telemetry.length === 0) {
      throw new Error('Telemetry data cannot be empty');
    }

    // Extract patterns
    const patterns = this.extractPatterns(deviceId, telemetry);

    // Classify patterns as normal or anomalous
    const normalBehavior: IBehaviorPattern[] = [];
    const anomalousBehavior: IBehaviorPattern[] = [];

    for (const pattern of patterns) {
      if (this.isAnomalousPattern(pattern)) {
        anomalousBehavior.push(pattern);
      } else {
        normalBehavior.push(pattern);
      }
    }

    // Calculate risk score
    const riskScore = this.calculateRiskScore(anomalousBehavior, normalBehavior);

    // Store patterns
    this.devicePatterns.set(deviceId, patterns);

    return {
      deviceId,
      normalBehavior,
      anomalousBehavior,
      riskScore,
      timestamp: new Date(),
    };
  }

  /**
   * Detect anomalous patterns for a device
   */
  async detectAnomalousPatterns(deviceId: string): Promise<IBehaviorPattern[]> {
    const patterns = this.devicePatterns.get(deviceId) || [];
    return patterns.filter((p) => this.isAnomalousPattern(p));
  }

  /**
   * Get normal patterns for a device
   */
  async getNormalPatterns(deviceId: string): Promise<IBehaviorPattern[]> {
    const patterns = this.devicePatterns.get(deviceId) || [];
    return patterns.filter((p) => !this.isAnomalousPattern(p));
  }

  /**
   * Update baseline behavior for a device
   */
  async updateBaseline(deviceId: string, telemetry: ITelemetryData[]): Promise<void> {
    const baseline = new Map<string, number>();

    // Calculate average metrics
    const metricSums = new Map<string, number>();
    const metricCounts = new Map<string, number>();

    for (const data of telemetry) {
      for (const [key, value] of Object.entries(data.metrics)) {
        metricSums.set(key, (metricSums.get(key) || 0) + value);
        metricCounts.set(key, (metricCounts.get(key) || 0) + 1);
      }
    }

    for (const [key, sum] of metricSums.entries()) {
      const count = metricCounts.get(key) || 1;
      baseline.set(key, sum / count);
    }

    this.deviceBaselines.set(deviceId, baseline);
  }

  /**
   * Extract behavior patterns from telemetry
   */
  private extractPatterns(deviceId: string, telemetry: ITelemetryData[]): IBehaviorPattern[] {
    const patterns: IBehaviorPattern[] = [];

    // Group by time windows (e.g., hourly)
    const timeWindows = this.groupByTimeWindow(telemetry, 3600000); // 1 hour

    for (const [window, data] of timeWindows.entries()) {
      const pattern = this.analyzeTimeWindow(deviceId, window, data);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Group telemetry by time windows
   */
  private groupByTimeWindow(
    telemetry: ITelemetryData[],
    windowSize: number,
  ): Map<number, ITelemetryData[]> {
    const windows = new Map<number, ITelemetryData[]>();

    for (const data of telemetry) {
      const windowKey = Math.floor(data.timestamp.getTime() / windowSize);
      if (!windows.has(windowKey)) {
        windows.set(windowKey, []);
      }
      windows.get(windowKey)!.push(data);
    }

    return windows;
  }

  /**
   * Analyze a time window
   */
  private analyzeTimeWindow(
    deviceId: string,
    _window: number,
    data: ITelemetryData[],
  ): IBehaviorPattern | null {
    if (data.length === 0) return null;

    // Calculate statistics for this window
    const characteristics: Record<string, any> = {};
    const metricValues = new Map<string, number[]>();

    for (const telemetry of data) {
      for (const [key, value] of Object.entries(telemetry.metrics)) {
        if (!metricValues.has(key)) {
          metricValues.set(key, []);
        }
        metricValues.get(key)!.push(value);
      }
    }

    // Calculate mean and std for each metric
    for (const [key, values] of metricValues.entries()) {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);

      characteristics[key] = { mean, std, min: Math.min(...values), max: Math.max(...values) };
    }

    return {
      deviceId,
      patternType: 'TEMPORAL',
      frequency: data.length,
      confidence: this.calculatePatternConfidence(data.length),
      firstSeen: data[0].timestamp,
      lastSeen: data[data.length - 1].timestamp,
      characteristics,
    };
  }

  /**
   * Check if pattern is anomalous
   */
  private isAnomalousPattern(pattern: IBehaviorPattern): boolean {
    // Simple heuristic: low confidence or unusual frequency
    if (pattern.confidence < 0.5) return true;
    if (pattern.frequency < 2) return true;

    // Check against baseline
    const baseline = this.deviceBaselines.get(pattern.deviceId);
    if (!baseline) return false;

    for (const [key, stats] of Object.entries(pattern.characteristics)) {
      const baselineValue = baseline.get(key);
      if (baselineValue && typeof stats === 'object' && 'mean' in stats) {
        const deviation = Math.abs(stats.mean - baselineValue) / (baselineValue || 1);
        if (deviation > 0.5) return true;
      }
    }

    return false;
  }

  /**
   * Calculate risk score based on patterns
   */
  private calculateRiskScore(anomalous: IBehaviorPattern[], normal: IBehaviorPattern[]): number {
    const total = anomalous.length + normal.length;
    if (total === 0) return 0;

    const anomalousRatio = anomalous.length / total;
    const avgAnomalousConfidence =
      anomalous.reduce((sum, p) => sum + p.confidence, 0) / (anomalous.length || 1);

    return (anomalousRatio + (1 - avgAnomalousConfidence)) / 2;
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(frequency: number): number {
    // Higher frequency = higher confidence
    return Math.min(frequency / 10, 1);
  }
}
