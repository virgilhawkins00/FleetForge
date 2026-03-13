/**
 * Azure Integration Types for FleetForge
 */

export interface AzureConfig {
  subscriptionId?: string;
  resourceGroup?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface IoTHubConfig extends AzureConfig {
  iotHubConnectionString: string;
  iotHubHostname?: string;
}

export interface BlobStorageConfig extends AzureConfig {
  storageAccountName: string;
  storageAccountKey?: string;
  connectionString?: string;
  firmwareContainer?: string;
  logsContainer?: string;
  backupContainer?: string;
}

export interface DataExplorerConfig extends AzureConfig {
  clusterUri: string;
  database: string;
  telemetryTable?: string;
  eventsTable?: string;
}

export interface TelemetryMessage {
  deviceId: string;
  fleetId?: string;
  organizationId?: string;
  timestamp: Date;
  metrics: Record<string, number | string | boolean>;
  metadata?: Record<string, string>;
}

export interface DeviceTwin {
  deviceId: string;
  etag?: string;
  status?: 'enabled' | 'disabled';
  tags?: Record<string, unknown>;
  properties?: {
    desired?: Record<string, unknown>;
    reported?: Record<string, unknown>;
  };
}

export interface CloudToDeviceMessage {
  deviceId: string;
  messageId?: string;
  data: string | Buffer;
  properties?: Record<string, string>;
  expiryTimeUtc?: Date;
  correlationId?: string;
  ack?: 'none' | 'positive' | 'negative' | 'full';
}

export interface BlobUploadResult {
  url: string;
  etag?: string;
  lastModified?: Date;
  contentMD5?: string;
}

export interface BlobDownloadResult {
  data: Buffer;
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
}

