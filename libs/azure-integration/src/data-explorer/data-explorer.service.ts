/**
 * Azure Data Explorer Service for FleetForge
 *
 * Provides time-series telemetry storage and KQL queries
 * Note: Uses Azure Data Tables as a simpler alternative for smaller deployments
 */

import { TableClient, AzureNamedKeyCredential } from '@azure/data-tables';
import { DataExplorerConfig, TelemetryMessage } from '../types';

export interface TelemetryQueryOptions {
  deviceId?: string;
  fleetId?: string;
  startTime?: Date;
  endTime?: Date;
  metrics?: string[];
  limit?: number;
}

export interface AggregatedTelemetry {
  deviceId: string;
  metric: string;
  avg: number;
  min: number;
  max: number;
  count: number;
  timestamp: Date;
}

export class DataExplorerService {
  private telemetryTable: TableClient;
  private eventsTable: TableClient;
  private initialized = false;

  constructor(config: DataExplorerConfig) {
    // Using Azure Tables (Data Explorer requires more complex setup)
    const accountName = config.clusterUri.split('.')[0].replace('https://', '');
    const credential = new AzureNamedKeyCredential(accountName, config.database);

    const telemetryTableName = config.telemetryTable || 'telemetry';
    const eventsTableName = config.eventsTable || 'events';

    this.telemetryTable = new TableClient(config.clusterUri, telemetryTableName, credential);
    this.eventsTable = new TableClient(config.clusterUri, eventsTableName, credential);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.telemetryTable.createTable();
    } catch {
      // Table may already exist
    }

    try {
      await this.eventsTable.createTable();
    } catch {
      // Table may already exist
    }

    this.initialized = true;
  }

  // ==================== Telemetry Write Operations ====================

  /**
   * Store a single telemetry record
   */
  async storeTelemetry(telemetry: TelemetryMessage): Promise<void> {
    const partitionKey = telemetry.deviceId;
    const rowKey = telemetry.timestamp.getTime().toString();

    await this.telemetryTable.createEntity({
      partitionKey,
      rowKey,
      deviceId: telemetry.deviceId,
      fleetId: telemetry.fleetId || '',
      organizationId: telemetry.organizationId || '',
      timestamp: telemetry.timestamp.toISOString(),
      metrics: JSON.stringify(telemetry.metrics),
      metadata: JSON.stringify(telemetry.metadata || {}),
    });
  }

  /**
   * Store multiple telemetry records in batch
   */
  async storeTelemetryBatch(records: TelemetryMessage[]): Promise<void> {
    // Group by device for batch operations
    const byDevice = new Map<string, TelemetryMessage[]>();
    for (const record of records) {
      const existing = byDevice.get(record.deviceId) || [];
      existing.push(record);
      byDevice.set(record.deviceId, existing);
    }

    const promises: Promise<void>[] = [];
    for (const [, deviceRecords] of byDevice) {
      for (const record of deviceRecords) {
        promises.push(this.storeTelemetry(record));
      }
    }

    await Promise.all(promises);
  }

  // ==================== Telemetry Query Operations ====================

  /**
   * Query telemetry data
   */
  async queryTelemetry(options: TelemetryQueryOptions): Promise<TelemetryMessage[]> {
    const results: TelemetryMessage[] = [];
    const filters: string[] = [];

    if (options.deviceId) {
      filters.push(`PartitionKey eq '${options.deviceId}'`);
    }
    if (options.startTime) {
      filters.push(`RowKey ge '${options.startTime.getTime()}'`);
    }
    if (options.endTime) {
      filters.push(`RowKey le '${options.endTime.getTime()}'`);
    }

    const filter = filters.length > 0 ? filters.join(' and ') : undefined;
    const queryOptions = { queryOptions: { filter } };

    let count = 0;
    const limit = options.limit || 1000;

    for await (const entity of this.telemetryTable.listEntities(queryOptions)) {
      if (count >= limit) break;

      results.push({
        deviceId: entity['deviceId'] as string,
        fleetId: (entity['fleetId'] as string) || undefined,
        organizationId: (entity['organizationId'] as string) || undefined,
        timestamp: new Date(entity['timestamp'] as string),
        metrics: JSON.parse(entity['metrics'] as string),
        metadata: JSON.parse((entity['metadata'] as string) || '{}'),
      });

      count++;
    }

    return results;
  }

  /**
   * Get latest telemetry for a device
   */
  async getLatestTelemetry(deviceId: string): Promise<TelemetryMessage | null> {
    const results = await this.queryTelemetry({
      deviceId,
      limit: 1,
    });
    return results[0] || null;
  }

  /**
   * Aggregate telemetry by time interval
   */
  async aggregateTelemetry(
    deviceId: string,
    metric: string,
    startTime: Date,
    endTime: Date,
    intervalMinutes = 60,
  ): Promise<AggregatedTelemetry[]> {
    const records = await this.queryTelemetry({
      deviceId,
      startTime,
      endTime,
      limit: 10000,
    });

    // Group by interval
    const buckets = new Map<number, number[]>();
    const intervalMs = intervalMinutes * 60 * 1000;

    for (const record of records) {
      const bucketTime = Math.floor(record.timestamp.getTime() / intervalMs) * intervalMs;
      const value = record.metrics[metric];

      if (typeof value === 'number') {
        const existing = buckets.get(bucketTime) || [];
        existing.push(value);
        buckets.set(bucketTime, existing);
      }
    }

    // Calculate aggregations
    const results: AggregatedTelemetry[] = [];

    for (const [bucketTime, values] of buckets) {
      if (values.length === 0) continue;

      results.push({
        deviceId,
        metric,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
        timestamp: new Date(bucketTime),
      });
    }

    return results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get device telemetry statistics
   */
  async getDeviceStats(
    deviceId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Record<string, { avg: number; min: number; max: number; count: number }>> {
    const records = await this.queryTelemetry({
      deviceId,
      startTime,
      endTime,
      limit: 10000,
    });

    const stats: Record<string, number[]> = {};

    for (const record of records) {
      for (const [key, value] of Object.entries(record.metrics)) {
        if (typeof value === 'number') {
          stats[key] = stats[key] || [];
          stats[key].push(value);
        }
      }
    }

    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};

    for (const [key, values] of Object.entries(stats)) {
      if (values.length > 0) {
        result[key] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
        };
      }
    }

    return result;
  }

  /**
   * Store an event
   */
  async storeEvent(
    deviceId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const timestamp = new Date();
    await this.eventsTable.createEntity({
      partitionKey: deviceId,
      rowKey: `${timestamp.getTime()}-${eventType}`,
      deviceId,
      eventType,
      timestamp: timestamp.toISOString(),
      payload: JSON.stringify(payload),
    });
  }

  /**
   * Query events for a device
   */
  async queryEvents(
    deviceId: string,
    startTime?: Date,
    endTime?: Date,
    eventType?: string,
  ): Promise<Array<{ deviceId: string; eventType: string; timestamp: Date; payload: unknown }>> {
    const filters = [`PartitionKey eq '${deviceId}'`];

    if (startTime) {
      filters.push(`RowKey ge '${startTime.getTime()}'`);
    }
    if (endTime) {
      filters.push(`RowKey le '${endTime.getTime()}'`);
    }

    const filter = filters.join(' and ');
    const results: Array<{
      deviceId: string;
      eventType: string;
      timestamp: Date;
      payload: unknown;
    }> = [];

    for await (const entity of this.eventsTable.listEntities({ queryOptions: { filter } })) {
      const event = {
        deviceId: entity['deviceId'] as string,
        eventType: entity['eventType'] as string,
        timestamp: new Date(entity['timestamp'] as string),
        payload: JSON.parse(entity['payload'] as string),
      };

      if (!eventType || event.eventType === eventType) {
        results.push(event);
      }
    }

    return results;
  }
}
