import { PubSubService } from './pubsub';
import { StorageService } from './storage';
import { BigQueryService } from './bigquery';
import { VertexAIService } from './vertex-ai';
import { GCPConfig, PubSubConfig, StorageConfig, BigQueryConfig, VertexAIConfig } from './types';

export interface GCPModuleConfig extends GCPConfig {
  enableVertexAI?: boolean;
}

/**
 * Unified GCP Integration Module for FleetForge
 *
 * Architecture (Post-IoT Core):
 * - Pub/Sub: Telemetry ingestion, device commands, events
 * - Cloud Storage: Firmware artifacts, device logs
 * - BigQuery: Analytics, long-term telemetry storage
 * - Vertex AI: Anomaly detection, predictive maintenance, insights
 * - Secret Manager: Credentials management (optional)
 * - Cloud Logging: Centralized logging
 */
export class GCPModule {
  public readonly pubsub: PubSubService;
  public readonly storage: StorageService;
  public readonly bigquery: BigQueryService;
  public readonly vertexAI: VertexAIService | null;

  private initialized = false;

  constructor(config: GCPModuleConfig) {
    this.pubsub = new PubSubService(config as PubSubConfig);
    this.storage = new StorageService(config as StorageConfig);
    this.bigquery = new BigQueryService(config as BigQueryConfig);
    this.vertexAI =
      config.enableVertexAI !== false ? new VertexAIService(config as VertexAIConfig) : null;
  }

  /**
   * Initialize all GCP services
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const initPromises = [
      this.pubsub.initialize(),
      this.storage.initialize(),
      this.bigquery.initialize(),
    ];

    if (this.vertexAI) {
      initPromises.push(this.vertexAI.initialize());
    }

    await Promise.all(initPromises);
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
export function createGCPModule(config: GCPModuleConfig): GCPModule {
  return new GCPModule(config);
}
