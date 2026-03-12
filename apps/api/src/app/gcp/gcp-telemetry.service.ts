import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { PubSubService, BigQueryService, TelemetryMessage } from '@fleetforge/gcp-integration';
import { Telemetry } from '@fleetforge/core';

/**
 * Service to stream telemetry data to GCP Pub/Sub and BigQuery
 */
@Injectable()
export class GCPTelemetryService {
  private readonly logger = new Logger(GCPTelemetryService.name);
  private buffer: TelemetryMessage[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject('GCP_ENABLED') private readonly enabled: boolean,
    @Optional() private readonly pubsub: PubSubService | null,
    @Optional() private readonly bigquery: BigQueryService | null,
  ) {
    if (this.enabled && this.bigquery) {
      // Flush buffer every 10 seconds for BigQuery batch inserts
      this.flushInterval = setInterval(() => this.flushToBigQuery(), 10000);
    }
  }

  /**
   * Stream telemetry to GCP Pub/Sub (real-time)
   */
  async streamTelemetry(telemetry: Telemetry): Promise<void> {
    if (!this.enabled || !this.pubsub) {
      return;
    }

    try {
      const message = this.toGCPMessage(telemetry);
      await this.pubsub.publishTelemetry(message);
      this.logger.debug(`Telemetry streamed to Pub/Sub: ${telemetry.deviceId}`);

      // Also buffer for BigQuery
      if (this.bigquery) {
        this.buffer.push(message);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to stream telemetry: ${err.message}`, err.stack);
    }
  }

  /**
   * Batch stream multiple telemetry records
   */
  async streamBatch(telemetryList: Telemetry[]): Promise<void> {
    if (!this.enabled) return;

    const messages = telemetryList.map((t) => this.toGCPMessage(t));

    // Stream to Pub/Sub
    if (this.pubsub) {
      await Promise.all(messages.map((m) => this.pubsub!.publishTelemetry(m)));
      this.logger.debug(`Batch of ${messages.length} telemetry streamed to Pub/Sub`);
    }

    // Buffer for BigQuery
    if (this.bigquery) {
      this.buffer.push(...messages);
    }
  }

  /**
   * Query historical telemetry from BigQuery
   */
  async queryHistory(
    deviceId: string,
    startTime: Date,
    endTime: Date,
    limit = 1000,
  ): Promise<TelemetryMessage[]> {
    if (!this.enabled || !this.bigquery) {
      return [];
    }

    try {
      return await this.bigquery.queryDeviceTelemetry(deviceId, startTime, endTime, limit);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to query BigQuery: ${err.message}`);
      return [];
    }
  }

  private async flushToBigQuery(): Promise<void> {
    if (!this.bigquery || this.buffer.length === 0) return;

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      await this.bigquery.insertTelemetry(batch);
      this.logger.debug(`Flushed ${batch.length} records to BigQuery`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to flush to BigQuery: ${err.message}`);
      // Re-add to buffer for retry
      this.buffer.unshift(...batch);
    }
  }

  private toGCPMessage(telemetry: Telemetry): TelemetryMessage {
    return {
      deviceId: telemetry.deviceId,
      timestamp: telemetry.timestamp,
      metrics: {
        batteryLevel: telemetry.batteryLevel ?? 0,
        signalStrength: telemetry.signalStrength ?? 0,
        latitude: telemetry.location?.latitude ?? 0,
        longitude: telemetry.location?.longitude ?? 0,
        ...telemetry.data,
      },
      metadata: {
        receivedAt: telemetry.receivedAt.toISOString(),
      },
    };
  }

  onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushToBigQuery(); // Final flush
    }
  }
}
