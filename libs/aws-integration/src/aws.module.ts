/**
 * AWS Integration Module for FleetForge
 * Provides unified access to AWS IoT Core, S3, and Timestream services
 */

import { IoTCoreService } from './iot-core';
import { S3Service } from './s3';
import { TimestreamService } from './timestream';
import { IoTCoreConfig, S3Config, TimestreamConfig } from './types';

export interface AWSModuleConfig {
  iotCore?: IoTCoreConfig;
  s3?: S3Config;
  timestream?: TimestreamConfig;
}

export class AWSModule {
  private iotCoreService?: IoTCoreService;
  private s3Service?: S3Service;
  private timestreamService?: TimestreamService;
  private initialized = false;

  constructor(config: AWSModuleConfig) {
    if (config.iotCore) {
      this.iotCoreService = new IoTCoreService(config.iotCore);
    }
    if (config.s3) {
      this.s3Service = new S3Service(config.s3);
    }
    if (config.timestream) {
      this.timestreamService = new TimestreamService(config.timestream);
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const initPromises: Promise<void>[] = [];

    if (this.iotCoreService) {
      initPromises.push(this.iotCoreService.initialize());
    }
    if (this.s3Service) {
      initPromises.push(this.s3Service.initialize());
    }
    if (this.timestreamService) {
      initPromises.push(this.timestreamService.initialize());
    }

    await Promise.all(initPromises);
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getIoTCore(): IoTCoreService {
    if (!this.iotCoreService) {
      throw new Error('IoT Core service not configured');
    }
    return this.iotCoreService;
  }

  getS3(): S3Service {
    if (!this.s3Service) {
      throw new Error('S3 service not configured');
    }
    return this.s3Service;
  }

  getTimestream(): TimestreamService {
    if (!this.timestreamService) {
      throw new Error('Timestream service not configured');
    }
    return this.timestreamService;
  }
}

/**
 * Factory function to create AWS Module
 */
export function createAWSModule(config: AWSModuleConfig): AWSModule {
  return new AWSModule(config);
}
