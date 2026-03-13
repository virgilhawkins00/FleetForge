/**
 * AWS Timestream Service for FleetForge
 * Handles time-series telemetry data storage and queries
 */

import {
  TimestreamWriteClient,
  WriteRecordsCommand,
  CreateDatabaseCommand,
  CreateTableCommand,
  DescribeDatabaseCommand,
  DescribeTableCommand,
  MeasureValueType,
  _Record,
} from '@aws-sdk/client-timestream-write';
import { TimestreamQueryClient, QueryCommand } from '@aws-sdk/client-timestream-query';
import { TimestreamConfig, TelemetryRecord } from '../types';

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  nextToken?: string;
}

export class TimestreamService {
  private writeClient: TimestreamWriteClient;
  private queryClient: TimestreamQueryClient;
  private config: TimestreamConfig;
  private initialized = false;

  constructor(config: TimestreamConfig) {
    this.config = {
      retentionDays: 365,
      ...config,
    };

    this.writeClient = new TimestreamWriteClient({
      region: config.region,
      credentials: config.credentials,
      endpoint: config.endpoint,
    });

    this.queryClient = new TimestreamQueryClient({
      region: config.region,
      credentials: config.credentials,
      endpoint: config.endpoint,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.ensureDatabase();
    await this.ensureTable(this.config.telemetryTable);
    if (this.config.eventsTable) {
      await this.ensureTable(this.config.eventsTable);
    }
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private async ensureDatabase(): Promise<void> {
    try {
      await this.writeClient.send(
        new DescribeDatabaseCommand({ DatabaseName: this.config.database }),
      );
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'ResourceNotFoundException') {
        await this.writeClient.send(
          new CreateDatabaseCommand({ DatabaseName: this.config.database }),
        );
      } else {
        throw error;
      }
    }
  }

  private async ensureTable(tableName: string): Promise<void> {
    try {
      await this.writeClient.send(
        new DescribeTableCommand({
          DatabaseName: this.config.database,
          TableName: tableName,
        }),
      );
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'ResourceNotFoundException') {
        await this.writeClient.send(
          new CreateTableCommand({
            DatabaseName: this.config.database,
            TableName: tableName,
            RetentionProperties: {
              MemoryStoreRetentionPeriodInHours: 24,
              MagneticStoreRetentionPeriodInDays: this.config.retentionDays,
            },
          }),
        );
      } else {
        throw error;
      }
    }
  }

  async writeTelemetry(records: TelemetryRecord[]): Promise<number> {
    const timestreamRecords: _Record[] = [];

    for (const record of records) {
      const dimensions = Object.entries(record.dimensions).map(([k, v]) => ({
        Name: k,
        Value: v,
      }));
      dimensions.push({ Name: 'deviceId', Value: record.deviceId });

      for (const [measureName, measureValue] of Object.entries(record.measures)) {
        timestreamRecords.push({
          Dimensions: dimensions,
          MeasureName: measureName,
          MeasureValue: String(measureValue),
          MeasureValueType: this.getMeasureType(measureValue),
          Time: String(record.timestamp.getTime()),
          TimeUnit: 'MILLISECONDS',
        });
      }
    }

    await this.writeClient.send(
      new WriteRecordsCommand({
        DatabaseName: this.config.database,
        TableName: this.config.telemetryTable,
        Records: timestreamRecords,
      }),
    );

    return timestreamRecords.length;
  }

  private getMeasureType(value: unknown): MeasureValueType {
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (typeof value === 'number') return Number.isInteger(value) ? 'BIGINT' : 'DOUBLE';
    return 'VARCHAR';
  }

  async queryTelemetry(
    deviceId: string,
    measureName: string,
    startTime: Date,
    endTime: Date,
    limit = 1000,
  ): Promise<QueryResult> {
    const query = `
      SELECT time, measure_value::double as value
      FROM "${this.config.database}"."${this.config.telemetryTable}"
      WHERE deviceId = '${deviceId}'
        AND measure_name = '${measureName}'
        AND time BETWEEN from_milliseconds(${startTime.getTime()})
                     AND from_milliseconds(${endTime.getTime()})
      ORDER BY time DESC
      LIMIT ${limit}
    `;

    return this.executeQuery(query);
  }

  async getLatestTelemetry(deviceId: string, measureNames?: string[]): Promise<QueryResult> {
    const measureFilter = measureNames
      ? `AND measure_name IN (${measureNames.map((m) => `'${m}'`).join(',')})`
      : '';

    const query = `
      SELECT measure_name, measure_value::double as value, time
      FROM "${this.config.database}"."${this.config.telemetryTable}"
      WHERE deviceId = '${deviceId}'
        ${measureFilter}
        AND time > ago(1h)
      ORDER BY time DESC
      LIMIT 100
    `;

    return this.executeQuery(query);
  }

  async getAggregatedTelemetry(
    deviceId: string,
    measureName: string,
    startTime: Date,
    endTime: Date,
    intervalMinutes = 60,
  ): Promise<QueryResult> {
    const query = `
      SELECT bin(time, ${intervalMinutes}m) as time_bucket,
             AVG(measure_value::double) as avg_value,
             MIN(measure_value::double) as min_value,
             MAX(measure_value::double) as max_value,
             COUNT(*) as sample_count
      FROM "${this.config.database}"."${this.config.telemetryTable}"
      WHERE deviceId = '${deviceId}'
        AND measure_name = '${measureName}'
        AND time BETWEEN from_milliseconds(${startTime.getTime()})
                     AND from_milliseconds(${endTime.getTime()})
      GROUP BY bin(time, ${intervalMinutes}m)
      ORDER BY time_bucket DESC
    `;

    return this.executeQuery(query);
  }

  async executeQuery(queryString: string, nextToken?: string): Promise<QueryResult> {
    const response = await this.queryClient.send(
      new QueryCommand({
        QueryString: queryString,
        NextToken: nextToken,
      }),
    );

    const columns = response.ColumnInfo?.map((c) => c.Name || 'unknown') || [];
    const rows: Record<string, unknown>[] = [];

    for (const row of response.Rows || []) {
      const rowData: Record<string, unknown> = {};
      row.Data?.forEach((cell, index) => {
        const colName = columns[index];
        if (cell.ScalarValue !== undefined) {
          rowData[colName] = cell.ScalarValue;
        } else if (cell.NullValue) {
          rowData[colName] = null;
        }
      });
      rows.push(rowData);
    }

    return {
      columns,
      rows,
      nextToken: response.NextToken,
    };
  }

  async getDeviceMetrics(
    deviceId: string,
    timeRangeHours = 24,
  ): Promise<Record<string, { latest: number; avg: number; min: number; max: number }>> {
    const query = `
      SELECT measure_name,
             LAST(measure_value::double, time) as latest,
             AVG(measure_value::double) as avg,
             MIN(measure_value::double) as min,
             MAX(measure_value::double) as max
      FROM "${this.config.database}"."${this.config.telemetryTable}"
      WHERE deviceId = '${deviceId}'
        AND time > ago(${timeRangeHours}h)
      GROUP BY measure_name
    `;

    const result = await this.executeQuery(query);
    const metrics: Record<string, { latest: number; avg: number; min: number; max: number }> = {};

    for (const row of result.rows) {
      const name = row['measure_name'] as string;
      metrics[name] = {
        latest: parseFloat(row['latest'] as string) || 0,
        avg: parseFloat(row['avg'] as string) || 0,
        min: parseFloat(row['min'] as string) || 0,
        max: parseFloat(row['max'] as string) || 0,
      };
    }

    return metrics;
  }
}
