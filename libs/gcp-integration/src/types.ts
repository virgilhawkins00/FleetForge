/**
 * GCP Integration Types for FleetForge
 */

export interface GCPConfig {
  projectId: string;
  credentials?: string; // Path to service account JSON or GOOGLE_APPLICATION_CREDENTIALS
  region?: string;
}

export interface PubSubConfig extends GCPConfig {
  telemetryTopic?: string;
  commandsTopic?: string;
  eventsTopic?: string;
  deadLetterTopic?: string;
}

export interface StorageConfig extends GCPConfig {
  firmwareBucket?: string;
  logsBucket?: string;
  backupBucket?: string;
}

export interface BigQueryConfig extends GCPConfig {
  dataset?: string;
  telemetryTable?: string;
  eventsTable?: string;
  analyticsTable?: string;
}

export interface VertexAIConfig extends GCPConfig {
  model?: string; // Default: gemini-1.5-flash
  maxTokens?: number;
  temperature?: number;
}

export interface TelemetryMessage {
  deviceId: string;
  fleetId?: string;
  timestamp: Date;
  metrics: Record<string, number | string | boolean>;
  metadata?: Record<string, string>;
}

export interface DeviceCommand {
  deviceId: string;
  commandType: 'reboot' | 'update' | 'config' | 'custom';
  payload: Record<string, unknown>;
  correlationId?: string;
  expiresAt?: Date;
}

export interface DeviceEvent {
  deviceId: string;
  eventType: 'connect' | 'disconnect' | 'error' | 'state_change' | 'telemetry';
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface FirmwareArtifact {
  version: string;
  deviceType: string;
  fileName: string;
  checksum: string;
  size: number;
  uploadedAt: Date;
  metadata?: Record<string, string>;
}

export interface PublishResult {
  messageId: string;
  topic: string;
  timestamp: Date;
}

export interface SubscriptionOptions {
  maxMessages?: number;
  ackDeadlineSeconds?: number;
  flowControl?: {
    maxMessages: number;
    maxBytes: number;
  };
}

export type MessageHandler<T> = (
  message: T,
  ackFn: () => void,
  nackFn: () => void,
) => Promise<void>;
