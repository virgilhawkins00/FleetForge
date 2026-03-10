/**
 * Predictive Maintenance Engine
 * Predicts device failures and maintenance needs
 */

import {
  IPredictiveMaintenanceEngine,
  ITrainingData,
  IMaintenancePrediction,
  HealthStatus,
} from '../types';

export class PredictiveMaintenanceEngine implements IPredictiveMaintenanceEngine {
  private deviceBaselines = new Map<string, Record<string, number>>();
  private deviceTrends = new Map<string, Map<string, number[]>>();
  private trained = false;

  /**
   * Train the predictive maintenance model
   */
  async train(historicalData: ITrainingData): Promise<void> {
    if (historicalData.features.length === 0) {
      throw new Error('Training data cannot be empty');
    }

    // Group data by device
    const deviceData = new Map<string, number[][]>();

    for (let i = 0; i < historicalData.deviceIds.length; i++) {
      const deviceId = historicalData.deviceIds[i];
      const features = historicalData.features[i];

      if (!deviceData.has(deviceId)) {
        deviceData.set(deviceId, []);
      }
      deviceData.get(deviceId)!.push(features);
    }

    // Calculate baselines and trends for each device
    for (const [deviceId, data] of deviceData.entries()) {
      this.calculateBaseline(deviceId, data);
      this.calculateTrends(deviceId, data);
    }

    this.trained = true;
  }

  /**
   * Predict maintenance needs for a device
   */
  async predict(
    deviceId: string,
    currentMetrics: Record<string, number>,
  ): Promise<IMaintenancePrediction> {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const baseline = this.deviceBaselines.get(deviceId);
    const trends = this.deviceTrends.get(deviceId);

    if (!baseline || !trends) {
      // No historical data for this device - use conservative estimates
      return this.getDefaultPrediction(deviceId, currentMetrics);
    }

    // Calculate health score
    const healthScore = this.calculateHealthScore(currentMetrics, baseline);
    const healthStatus = this.getHealthStatus(healthScore);

    // Predict failure date based on trends
    const remainingUsefulLife = this.calculateRemainingUsefulLife(currentMetrics, baseline, trends);

    const predictedFailureDate = new Date();
    predictedFailureDate.setHours(predictedFailureDate.getHours() + remainingUsefulLife);

    // Generate recommendations
    const recommendations = this.generateRecommendations(currentMetrics, baseline, healthStatus);

    // Identify critical metrics
    const criticalMetrics = this.identifyCriticalMetrics(currentMetrics, baseline, trends);

    return {
      deviceId,
      predictedFailureDate,
      confidence: this.calculateConfidence(healthScore, trends),
      remainingUsefulLife,
      healthStatus,
      recommendations,
      criticalMetrics,
    };
  }

  /**
   * Predict maintenance for multiple devices
   */
  async predictBatch(
    devices: Array<{ deviceId: string; metrics: Record<string, number> }>,
  ): Promise<IMaintenancePrediction[]> {
    return Promise.all(devices.map((device) => this.predict(device.deviceId, device.metrics)));
  }

  /**
   * Update model with new data
   */
  async updateModel(newData: ITrainingData): Promise<void> {
    await this.train(newData);
  }

  /**
   * Calculate baseline metrics for a device
   */
  private calculateBaseline(deviceId: string, data: number[][]): void {
    const numFeatures = data[0].length;
    const baseline: Record<string, number> = {};

    for (let i = 0; i < numFeatures; i++) {
      const values = data.map((sample) => sample[i]);
      baseline[`metric_${i}`] = this.calculateMedian(values);
    }

    this.deviceBaselines.set(deviceId, baseline);
  }

  /**
   * Calculate trends for each metric
   */
  private calculateTrends(deviceId: string, data: number[][]): void {
    const trends = new Map<string, number[]>();
    const numFeatures = data[0].length;

    for (let i = 0; i < numFeatures; i++) {
      const values = data.map((sample) => sample[i]);
      trends.set(`metric_${i}`, values);
    }

    this.deviceTrends.set(deviceId, trends);
  }

  /**
   * Calculate health score (0-1, higher is better)
   */
  private calculateHealthScore(
    current: Record<string, number>,
    baseline: Record<string, number>,
  ): number {
    const deviations: number[] = [];

    for (const key in current) {
      if (baseline[key] !== undefined) {
        const deviation = Math.abs(current[key] - baseline[key]) / (baseline[key] || 1);
        deviations.push(deviation);
      }
    }

    const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
    return Math.max(0, 1 - avgDeviation);
  }

  /**
   * Get health status from score
   */
  private getHealthStatus(score: number): HealthStatus {
    if (score >= 0.9) return HealthStatus.HEALTHY;
    if (score >= 0.7) return HealthStatus.WARNING;
    if (score >= 0.5) return HealthStatus.DEGRADED;
    if (score >= 0.3) return HealthStatus.CRITICAL;
    return HealthStatus.FAILED;
  }

  /**
   * Calculate remaining useful life in hours
   */
  private calculateRemainingUsefulLife(
    current: Record<string, number>,
    baseline: Record<string, number>,
    trends: Map<string, number[]>,
  ): number {
    // Simplified RUL calculation
    const healthScore = this.calculateHealthScore(current, baseline);

    // Estimate based on health score and degradation rate
    const degradationRate = this.estimateDegradationRate(trends);
    const remainingHealth = healthScore;

    if (degradationRate === 0) {
      return 8760; // 1 year if no degradation
    }

    return Math.max(0, (remainingHealth / degradationRate) * 24);
  }

  /**
   * Estimate degradation rate from trends
   */
  private estimateDegradationRate(trends: Map<string, number[]>): number {
    const rates: number[] = [];

    for (const values of trends.values()) {
      if (values.length < 2) continue;

      // Simple linear regression slope
      const n = values.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = values.reduce((sum, v) => sum + v, 0);
      const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      rates.push(Math.abs(slope));
    }

    return rates.length > 0 ? rates.reduce((sum, r) => sum + r, 0) / rates.length : 0;
  }

  /**
   * Generate maintenance recommendations
   */
  private generateRecommendations(
    _current: Record<string, number>,
    _baseline: Record<string, number>,
    status: HealthStatus,
  ): string[] {
    const recommendations: string[] = [];

    if (status === HealthStatus.CRITICAL || status === HealthStatus.FAILED) {
      recommendations.push('Schedule immediate maintenance');
      recommendations.push('Inspect all critical components');
    } else if (status === HealthStatus.DEGRADED) {
      recommendations.push('Schedule preventive maintenance within 7 days');
      recommendations.push('Monitor device closely');
    } else if (status === HealthStatus.WARNING) {
      recommendations.push('Schedule routine inspection');
    }

    return recommendations;
  }

  /**
   * Identify critical metrics
   */
  private identifyCriticalMetrics(
    current: Record<string, number>,
    baseline: Record<string, number>,
    trends: Map<string, number[]>,
  ): Array<{
    metric: string;
    currentValue: number;
    threshold: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  }> {
    const critical: Array<any> = [];

    for (const key in current) {
      const deviation = Math.abs(current[key] - baseline[key]) / (baseline[key] || 1);

      if (deviation > 0.2) {
        const trendValues = trends.get(key);
        const trend = this.determineTrend(trendValues || []);

        critical.push({
          metric: key,
          currentValue: current[key],
          threshold: baseline[key] * 1.2,
          trend,
        });
      }
    }

    return critical;
  }

  /**
   * Determine trend direction
   */
  private determineTrend(values: number[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (values.length < 2) return 'STABLE';

    const recent = values.slice(-5);
    const avg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const last = recent[recent.length - 1];

    if (last > avg * 1.1) return 'INCREASING';
    if (last < avg * 0.9) return 'DECREASING';
    return 'STABLE';
  }

  /**
   * Calculate median
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(healthScore: number, trends: Map<string, number[]>): number {
    const dataPoints = Array.from(trends.values())[0]?.length || 0;
    const dataConfidence = Math.min(dataPoints / 100, 1);
    return (healthScore + dataConfidence) / 2;
  }

  /**
   * Get default prediction for unknown device
   */
  private getDefaultPrediction(
    deviceId: string,
    _currentMetrics: Record<string, number>,
  ): IMaintenancePrediction {
    const predictedFailureDate = new Date();
    predictedFailureDate.setMonth(predictedFailureDate.getMonth() + 6);

    return {
      deviceId,
      predictedFailureDate,
      confidence: 0.3,
      remainingUsefulLife: 4380, // 6 months
      healthStatus: HealthStatus.HEALTHY,
      recommendations: ['Collect more historical data for accurate predictions'],
      criticalMetrics: [],
    };
  }
}
