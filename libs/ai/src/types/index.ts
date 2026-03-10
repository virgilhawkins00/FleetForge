/**
 * AI Service Types and Interfaces
 */

export enum AnomalyType {
  STATISTICAL = 'STATISTICAL',
  BEHAVIORAL = 'BEHAVIORAL',
  TEMPORAL = 'TEMPORAL',
  SPATIAL = 'SPATIAL',
}

export enum AnomalySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  PREDICTIVE = 'PREDICTIVE',
  CORRECTIVE = 'CORRECTIVE',
  EMERGENCY = 'EMERGENCY',
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  DEGRADED = 'DEGRADED',
  CRITICAL = 'CRITICAL',
  FAILED = 'FAILED',
}

export interface ITelemetryData {
  deviceId: string;
  timestamp: Date;
  metrics: Record<string, number>;
  metadata?: Record<string, any>;
}

export interface IAnomaly {
  id: string;
  deviceId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  score: number; // 0-1, higher = more anomalous
  detectedAt: Date;
  metrics: Record<string, number>;
  description: string;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface IAnomalyDetectionResult {
  deviceId: string;
  isAnomaly: boolean;
  score: number;
  anomalies: IAnomaly[];
  timestamp: Date;
}

export interface IIsolationForestConfig {
  numTrees: number;
  sampleSize: number;
  maxDepth?: number;
  contamination: number; // Expected proportion of anomalies (0-1)
  randomSeed?: number;
}

export interface IMaintenancePrediction {
  deviceId: string;
  predictedFailureDate: Date;
  confidence: number; // 0-1
  remainingUsefulLife: number; // hours
  healthStatus: HealthStatus;
  recommendations: string[];
  criticalMetrics: Array<{
    metric: string;
    currentValue: number;
    threshold: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  }>;
}

export interface IBehaviorPattern {
  deviceId: string;
  patternType: string;
  frequency: number;
  confidence: number;
  firstSeen: Date;
  lastSeen: Date;
  characteristics: Record<string, any>;
}

export interface IBehaviorAnalysisResult {
  deviceId: string;
  normalBehavior: IBehaviorPattern[];
  anomalousBehavior: IBehaviorPattern[];
  riskScore: number; // 0-1
  timestamp: Date;
}

export interface IModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

export interface ITrainingData {
  features: number[][];
  labels?: number[]; // Optional for unsupervised learning
  timestamps: Date[];
  deviceIds: string[];
}

export interface IFeatureImportance {
  feature: string;
  importance: number;
  rank: number;
}

// Anomaly Detector Interface
export interface IAnomalyDetector {
  train(data: ITrainingData): Promise<void>;
  detect(telemetry: ITelemetryData): Promise<IAnomalyDetectionResult>;
  detectBatch(telemetry: ITelemetryData[]): Promise<IAnomalyDetectionResult[]>;
  getModelMetrics(): IModelMetrics;
  getFeatureImportance(): IFeatureImportance[];
}

// Predictive Maintenance Interface
export interface IPredictiveMaintenanceEngine {
  train(historicalData: ITrainingData): Promise<void>;
  predict(deviceId: string, currentMetrics: Record<string, number>): Promise<IMaintenancePrediction>;
  predictBatch(devices: Array<{ deviceId: string; metrics: Record<string, number> }>): Promise<IMaintenancePrediction[]>;
  updateModel(newData: ITrainingData): Promise<void>;
}

// Behavior Analyzer Interface
export interface IBehaviorAnalyzer {
  analyzePattern(deviceId: string, telemetry: ITelemetryData[]): Promise<IBehaviorAnalysisResult>;
  detectAnomalousPatterns(deviceId: string): Promise<IBehaviorPattern[]>;
  getNormalPatterns(deviceId: string): Promise<IBehaviorPattern[]>;
  updateBaseline(deviceId: string, telemetry: ITelemetryData[]): Promise<void>;
}

// Isolation Forest Node
export interface IIsolationTreeNode {
  isLeaf: boolean;
  splitFeature?: number;
  splitValue?: number;
  left?: IIsolationTreeNode;
  right?: IIsolationTreeNode;
  size?: number;
}

// Isolation Forest Tree
export interface IIsolationTree {
  root: IIsolationTreeNode;
  maxDepth: number;
  build(data: number[][], currentDepth: number): IIsolationTreeNode;
  pathLength(sample: number[]): number;
}

