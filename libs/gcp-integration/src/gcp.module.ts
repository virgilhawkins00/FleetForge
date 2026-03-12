import { PubSubService } from './pubsub';
import { StorageService } from './storage';
import { BigQueryService } from './bigquery';
import { GCPConfig, PubSubConfig, StorageConfig, BigQueryConfig } from './types';

/**
 * Unified GCP Integration Module for FleetForge
 * 
 * Architecture (Post-IoT Core):
 * - Pub/Sub: Telemetry ingestion, device commands, events
 * - Cloud Storage: Firmware artifacts, device logs
 * - BigQuery: Analytics, long-term telemetry storage
 * - Secret Manager: Credentials management (optional)
 * - Cloud Logging: Centralized logging
 */
export class GCPModule {
  public readonly pubsub: PubSubService;
  public readonly storage: StorageService;
  public readonly bigquery: BigQueryService;

  private initialized = false;

  constructor(config: GCPConfig) {
    this.pubsub = new PubSubService(config as PubSubConfig);
    this.storage = new StorageService(config as StorageConfig);
    this.bigquery = new BigQueryService(config as BigQueryConfig);
  }

  /**
   * Initialize all GCP services
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Promise.all([
      this.pubsub.initialize(),
      this.storage.initialize(),
      this.bigquery.initialize(),
    ]);

    this.initialized = true;
  }

  /**
   * Check if module is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    await this.pubsub.close();
    this.initialized = false;
  }
}

/**
 * Factory function for creating GCP module
 */
export function createGCPModule(config: GCPConfig): GCPModule {
  return new GCPModule(config);
}

