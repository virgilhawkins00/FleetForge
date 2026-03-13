/**
 * Azure Integration Module for FleetForge
 *
 * Provides unified access to Azure IoT services:
 * - IoT Hub: Device registry, twins, C2D messaging
 * - Blob Storage: Firmware, logs, backups
 * - Data Explorer/Tables: Time-series telemetry
 */

import { IoTHubService } from './iot-hub';
import { BlobStorageService } from './blob-storage';
import { DataExplorerService } from './data-explorer';
import { AzureConfig, IoTHubConfig, BlobStorageConfig, DataExplorerConfig } from './types';

export interface AzureModuleConfig extends AzureConfig {
  iotHub?: IoTHubConfig;
  blobStorage?: BlobStorageConfig;
  dataExplorer?: DataExplorerConfig;
}

export class AzureModule {
  public readonly iotHub: IoTHubService | null;
  public readonly blobStorage: BlobStorageService | null;
  public readonly dataExplorer: DataExplorerService | null;

  private initialized = false;

  constructor(config: AzureModuleConfig) {
    this.iotHub = config.iotHub ? new IoTHubService(config.iotHub) : null;
    this.blobStorage = config.blobStorage ? new BlobStorageService(config.blobStorage) : null;
    this.dataExplorer = config.dataExplorer ? new DataExplorerService(config.dataExplorer) : null;
  }

  /**
   * Initialize all configured Azure services
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const initPromises: Promise<void>[] = [];

    if (this.iotHub) initPromises.push(this.iotHub.initialize());
    if (this.blobStorage) initPromises.push(this.blobStorage.initialize());
    if (this.dataExplorer) initPromises.push(this.dataExplorer.initialize());

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
    if (this.iotHub) await this.iotHub.close();
    this.initialized = false;
  }
}

/**
 * Factory function for creating Azure module
 */
export function createAzureModule(config: AzureModuleConfig): AzureModule {
  return new AzureModule(config);
}

