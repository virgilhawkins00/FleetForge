import { BigQuery, Dataset, Table } from '@google-cloud/bigquery';
import { BigQueryConfig, TelemetryMessage, DeviceEvent } from '../types';

/**
 * Google BigQuery Service for analytics and long-term storage
 */
export class BigQueryService {
  private client: BigQuery;
  private config: BigQueryConfig;
  private dataset: Dataset | null = null;

  constructor(config: BigQueryConfig) {
    this.config = {
      dataset: 'fleetforge_iot',
      telemetryTable: 'device_telemetry',
      eventsTable: 'device_events',
      analyticsTable: 'analytics_metrics',
      ...config,
    };

    this.client = new BigQuery({
      projectId: config.projectId,
      keyFilename: config.credentials,
    });
  }

  /**
   * Initialize BigQuery dataset and tables
   */
  async initialize(): Promise<void> {
    await this.ensureDataset();
    await this.ensureTelemetryTable();
    await this.ensureEventsTable();
  }

  private async ensureDataset(): Promise<Dataset> {
    if (this.dataset) return this.dataset;

    const dataset = this.client.dataset(this.config.dataset!);
    const [exists] = await dataset.exists();

    if (!exists) {
      await dataset.create({ location: this.config.region || 'US' });
    }

    this.dataset = dataset;
    return dataset;
  }

  private async ensureTelemetryTable(): Promise<Table> {
    const dataset = await this.ensureDataset();
    const table = dataset.table(this.config.telemetryTable!);
    const [exists] = await table.exists();

    if (!exists) {
      await table.create({
        schema: {
          fields: [
            { name: 'device_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'fleet_id', type: 'STRING', mode: 'NULLABLE' },
            { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
            { name: 'metrics', type: 'JSON', mode: 'REQUIRED' },
            { name: 'metadata', type: 'JSON', mode: 'NULLABLE' },
            { name: 'ingested_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
          ],
        },
        timePartitioning: { type: 'DAY', field: 'timestamp' },
        clustering: { fields: ['device_id', 'fleet_id'] },
      });
    }

    return table;
  }

  private async ensureEventsTable(): Promise<Table> {
    const dataset = await this.ensureDataset();
    const table = dataset.table(this.config.eventsTable!);
    const [exists] = await table.exists();

    if (!exists) {
      await table.create({
        schema: {
          fields: [
            { name: 'device_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'event_type', type: 'STRING', mode: 'REQUIRED' },
            { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
            { name: 'data', type: 'JSON', mode: 'REQUIRED' },
            { name: 'ingested_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
          ],
        },
        timePartitioning: { type: 'DAY', field: 'timestamp' },
      });
    }

    return table;
  }

  /**
   * Insert telemetry data (streaming insert)
   */
  async insertTelemetry(messages: TelemetryMessage[]): Promise<void> {
    const dataset = await this.ensureDataset();
    const table = dataset.table(this.config.telemetryTable!);

    const rows = messages.map((msg) => ({
      device_id: msg.deviceId,
      fleet_id: msg.fleetId || null,
      timestamp: msg.timestamp.toISOString(),
      metrics: JSON.stringify(msg.metrics),
      metadata: msg.metadata ? JSON.stringify(msg.metadata) : null,
      ingested_at: new Date().toISOString(),
    }));

    await table.insert(rows);
  }

  /**
   * Insert device events
   */
  async insertEvents(events: DeviceEvent[]): Promise<void> {
    const dataset = await this.ensureDataset();
    const table = dataset.table(this.config.eventsTable!);

    const rows = events.map((event) => ({
      device_id: event.deviceId,
      event_type: event.eventType,
      timestamp: event.timestamp.toISOString(),
      data: JSON.stringify(event.data),
      ingested_at: new Date().toISOString(),
    }));

    await table.insert(rows);
  }

  /**
   * Query device telemetry for analytics
   */
  async queryDeviceTelemetry(
    deviceId: string,
    startTime: Date,
    endTime: Date,
    limit = 1000,
  ): Promise<TelemetryMessage[]> {
    const query = `
      SELECT device_id, fleet_id, timestamp, metrics, metadata
      FROM \`${this.config.projectId}.${this.config.dataset}.${this.config.telemetryTable}\`
      WHERE device_id = @deviceId
        AND timestamp BETWEEN @startTime AND @endTime
      ORDER BY timestamp DESC
      LIMIT @limit
    `;

    const [rows] = await this.client.query({
      query,
      params: {
        deviceId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        limit,
      },
    });

    return rows.map((row: Record<string, unknown>) => ({
      deviceId: row['device_id'] as string,
      fleetId: row['fleet_id'] as string | undefined,
      timestamp: new Date(row['timestamp'] as string),
      metrics: JSON.parse(row['metrics'] as string),
      metadata: row['metadata'] ? JSON.parse(row['metadata'] as string) : undefined,
    }));
  }
}
