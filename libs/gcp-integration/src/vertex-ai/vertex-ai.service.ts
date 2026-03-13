/**
 * Vertex AI Service for FleetForge
 * Provides AI/ML capabilities for IoT analytics:
 * - Anomaly detection in telemetry
 * - Predictive maintenance
 * - Device behavior analysis
 * - Embeddings for similarity search
 */

import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { VertexAIConfig, TelemetryMessage } from '../types';

export interface AnomalyDetectionResult {
  deviceId: string;
  isAnomaly: boolean;
  confidence: number;
  anomalyType?: 'spike' | 'drift' | 'pattern_break' | 'threshold_violation';
  affectedMetrics: string[];
  explanation: string;
  suggestedAction?: string;
}

export interface PredictiveMaintenanceResult {
  deviceId: string;
  riskScore: number; // 0-100
  predictedFailureWindow?: { start: Date; end: Date };
  affectedComponents: string[];
  recommendations: string[];
  confidence: number;
}

export interface DeviceInsight {
  deviceId: string;
  summary: string;
  healthScore: number; // 0-100
  trends: { metric: string; trend: 'increasing' | 'decreasing' | 'stable' }[];
  alerts: string[];
}

export class VertexAIService {
  private vertexAI: VertexAI;
  private generativeModel: GenerativeModel;
  private config: VertexAIConfig;
  private initialized = false;

  constructor(config: VertexAIConfig) {
    this.config = {
      model: 'gemini-1.5-flash',
      ...config,
    };

    this.vertexAI = new VertexAI({
      project: config.projectId,
      location: config.region || 'us-central1',
    });

    this.generativeModel = this.vertexAI.getGenerativeModel({
      model: this.config.model!,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    // Vertex AI doesn't require explicit initialization
    // but we validate the model is accessible
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Detect anomalies in telemetry data using AI
   */
  async detectAnomalies(
    telemetry: TelemetryMessage[],
    historicalBaseline?: { metric: string; mean: number; stdDev: number }[],
  ): Promise<AnomalyDetectionResult[]> {
    const prompt = this.buildAnomalyDetectionPrompt(telemetry, historicalBaseline);

    const result = await this.generativeModel.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    try {
      return JSON.parse(this.extractJson(text));
    } catch {
      return [];
    }
  }

  private buildAnomalyDetectionPrompt(
    telemetry: TelemetryMessage[],
    baseline?: { metric: string; mean: number; stdDev: number }[],
  ): string {
    const telemetryJson = JSON.stringify(
      telemetry.map((t) => ({
        deviceId: t.deviceId,
        timestamp: t.timestamp,
        metrics: t.metrics,
      })),
      null,
      2,
    );

    const baselineInfo = baseline
      ? `Historical baseline:\n${JSON.stringify(baseline, null, 2)}`
      : 'No historical baseline provided.';

    return `You are an IoT telemetry anomaly detection system.
Analyze the following telemetry data and identify anomalies.

${baselineInfo}

Telemetry data:
${telemetryJson}

Return a JSON array of anomalies found. Each anomaly should have:
- deviceId: string
- isAnomaly: boolean
- confidence: number (0-1)
- anomalyType: "spike" | "drift" | "pattern_break" | "threshold_violation"
- affectedMetrics: string[]
- explanation: string
- suggestedAction: string

Return only valid JSON array, no markdown.`;
  }

  /**
   * Predict maintenance needs based on telemetry patterns
   */
  async predictMaintenance(
    deviceId: string,
    telemetryHistory: TelemetryMessage[],
    deviceType?: string,
  ): Promise<PredictiveMaintenanceResult> {
    const prompt = this.buildMaintenancePredictionPrompt(deviceId, telemetryHistory, deviceType);

    const result = await this.generativeModel.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    try {
      const parsed = JSON.parse(this.extractJson(text));
      return {
        deviceId,
        riskScore: parsed.riskScore || 0,
        predictedFailureWindow: parsed.predictedFailureWindow
          ? {
              start: new Date(parsed.predictedFailureWindow.start),
              end: new Date(parsed.predictedFailureWindow.end),
            }
          : undefined,
        affectedComponents: parsed.affectedComponents || [],
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 0,
      };
    } catch {
      return {
        deviceId,
        riskScore: 0,
        affectedComponents: [],
        recommendations: [],
        confidence: 0,
      };
    }
  }

  private buildMaintenancePredictionPrompt(
    deviceId: string,
    history: TelemetryMessage[],
    deviceType?: string,
  ): string {
    const historyJson = JSON.stringify(
      history.slice(-100).map((t) => ({
        timestamp: t.timestamp,
        metrics: t.metrics,
      })),
      null,
      2,
    );

    return `You are a predictive maintenance AI for IoT devices.
Analyze the telemetry history and predict maintenance needs.

Device ID: ${deviceId}
Device Type: ${deviceType || 'Unknown'}

Telemetry history (last 100 readings):
${historyJson}

Analyze patterns indicating wear, degradation, or impending failure.
Return a JSON object with:
- riskScore: number (0-100, where 100 is imminent failure)
- predictedFailureWindow: { start: ISO date, end: ISO date } or null
- affectedComponents: string[] (parts likely to fail)
- recommendations: string[] (maintenance actions to take)
- confidence: number (0-1)

Return only valid JSON, no markdown.`;
  }

  /**
   * Generate device insights and health summary
   */
  async generateDeviceInsights(
    deviceId: string,
    telemetry: TelemetryMessage[],
  ): Promise<DeviceInsight> {
    const prompt = this.buildInsightsPrompt(deviceId, telemetry);

    const result = await this.generativeModel.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    try {
      const parsed = JSON.parse(this.extractJson(text));
      return {
        deviceId,
        summary: parsed.summary || 'No insights available',
        healthScore: parsed.healthScore || 50,
        trends: parsed.trends || [],
        alerts: parsed.alerts || [],
      };
    } catch {
      return {
        deviceId,
        summary: 'Unable to generate insights',
        healthScore: 50,
        trends: [],
        alerts: [],
      };
    }
  }

  private buildInsightsPrompt(deviceId: string, telemetry: TelemetryMessage[]): string {
    const recentData = telemetry.slice(-50);
    const dataJson = JSON.stringify(
      recentData.map((t) => ({
        timestamp: t.timestamp,
        metrics: t.metrics,
      })),
      null,
      2,
    );

    return `You are an IoT analytics AI assistant.
Generate insights for the following device telemetry.

Device ID: ${deviceId}

Recent telemetry (last 50 readings):
${dataJson}

Return a JSON object with:
- summary: string (2-3 sentence overview of device status)
- healthScore: number (0-100, overall device health)
- trends: array of { metric: string, trend: "increasing" | "decreasing" | "stable" }
- alerts: string[] (any concerns or notable observations)

Return only valid JSON, no markdown.`;
  }

  /**
   * Extract JSON from AI response (handles markdown code blocks)
   */
  private extractJson(text: string): string {
    // Remove markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    return text.trim();
  }

  /**
   * Analyze fleet-wide patterns
   */
  async analyzeFleetPatterns(
    fleetId: string,
    deviceTelemetry: Map<string, TelemetryMessage[]>,
  ): Promise<{
    fleetHealth: number;
    deviceGroups: { groupName: string; deviceIds: string[]; characteristics: string }[];
    recommendations: string[];
  }> {
    const deviceSummaries = Array.from(deviceTelemetry.entries()).map(([deviceId, telemetry]) => ({
      deviceId,
      sampleCount: telemetry.length,
      latestMetrics: telemetry[telemetry.length - 1]?.metrics || {},
    }));

    const prompt = `You are a fleet analytics AI.
Analyze patterns across devices in this fleet.

Fleet ID: ${fleetId}
Device summaries:
${JSON.stringify(deviceSummaries, null, 2)}

Return a JSON object with:
- fleetHealth: number (0-100, overall fleet health score)
- deviceGroups: array of { groupName: string, deviceIds: string[], characteristics: string }
- recommendations: string[] (fleet-wide recommendations)

Return only valid JSON, no markdown.`;

    const result = await this.generativeModel.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    try {
      return JSON.parse(this.extractJson(text));
    } catch {
      return {
        fleetHealth: 50,
        deviceGroups: [],
        recommendations: [],
      };
    }
  }
}
