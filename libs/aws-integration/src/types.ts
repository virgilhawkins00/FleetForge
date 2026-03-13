/**
 * AWS Integration Types for FleetForge
 */

export interface AWSConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  endpoint?: string; // For LocalStack testing
}

export interface IoTCoreConfig extends AWSConfig {
  iotEndpoint: string; // AWS IoT Data endpoint (xxx.iot.region.amazonaws.com)
  thingTypeName?: string;
  thingGroupName?: string;
  policyName?: string;
}

export interface S3Config extends AWSConfig {
  firmwareBucket: string;
  logsBucket?: string;
  backupBucket?: string;
}

export interface TimestreamConfig extends AWSConfig {
  database: string;
  telemetryTable: string;
  eventsTable?: string;
  retentionDays?: number;
}

export interface ThingRegistration {
  thingName: string;
  thingTypeName?: string;
  attributes?: Record<string, string>;
  billingGroupName?: string;
}

export interface ThingInfo {
  thingName: string;
  thingId: string;
  thingArn: string;
  thingTypeName?: string;
  attributes: Record<string, string>;
  version: number;
}

export interface DeviceShadow {
  state: {
    desired?: Record<string, unknown>;
    reported?: Record<string, unknown>;
    delta?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  version: number;
  timestamp: number;
}

export interface TelemetryRecord {
  deviceId: string;
  timestamp: Date;
  dimensions: Record<string, string>;
  measures: Record<string, number | string | boolean>;
}

export interface PublishOptions {
  qos?: 0 | 1;
  retain?: boolean;
}

export interface PublishResult {
  messageId?: string;
  topic: string;
  timestamp: Date;
}

export interface FirmwareUploadResult {
  bucket: string;
  key: string;
  etag: string;
  versionId?: string;
  location: string;
}

export interface PresignedUrlOptions {
  expiresIn?: number; // Seconds, default 3600
  contentType?: string;
}

