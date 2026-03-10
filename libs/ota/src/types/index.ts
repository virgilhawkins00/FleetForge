/**
 * OTA Types and Interfaces
 */

import { DeploymentStrategy } from '@fleetforge/core';

export enum UpdateType {
  FULL = 'FULL',
  DELTA = 'DELTA',
  INCREMENTAL = 'INCREMENTAL',
}

export enum UpdateStatus {
  PENDING = 'PENDING',
  DOWNLOADING = 'DOWNLOADING',
  DOWNLOADED = 'DOWNLOADED',
  VERIFYING = 'VERIFYING',
  INSTALLING = 'INSTALLING',
  INSTALLED = 'INSTALLED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export enum RollbackReason {
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  INSTALLATION_FAILED = 'INSTALLATION_FAILED',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  MANUAL = 'MANUAL',
  TIMEOUT = 'TIMEOUT',
}

export interface IDeltaPatch {
  sourceVersion: string;
  targetVersion: string;
  patchData: Buffer;
  patchSize: number;
  compressionAlgorithm: 'gzip' | 'brotli' | 'none';
  checksum: string;
}

export interface IUpdatePackage {
  id: string;
  firmwareId: string;
  version: string;
  type: UpdateType;
  size: number;
  checksum: string;
  url?: string;
  data?: Buffer;
  deltaPatch?: IDeltaPatch;
  signature: {
    algorithm: string;
    signature: string;
    publicKey: string;
  };
}

export interface IDeploymentConfig {
  strategy: DeploymentStrategy;
  batchSize?: number;
  batchDelay?: number; // milliseconds
  canaryPercentage?: number;
  healthCheckInterval?: number; // milliseconds
  healthCheckTimeout?: number; // milliseconds
  maxFailureRate?: number; // 0-1
  autoRollback?: boolean;
}

export interface IDeploymentProgress {
  deploymentId: string;
  totalDevices: number;
  successCount: number;
  failureCount: number;
  pendingCount: number;
  currentBatch: number;
  totalBatches: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
}

export interface IDeviceUpdateStatus {
  deviceId: string;
  deploymentId: string;
  status: UpdateStatus;
  progress: number; // 0-100
  currentVersion: string;
  targetVersion: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  rollbackReason?: RollbackReason;
}

export interface IRollbackConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number; // milliseconds
  preserveUserData: boolean;
  notifyOnRollback: boolean;
}

export interface IHealthCheck {
  deviceId: string;
  timestamp: Date;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  metrics: {
    bootTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    connectivity?: boolean;
    customChecks?: Record<string, boolean>;
  };
}

export interface IDeltaGenerationOptions {
  compressionLevel?: number; // 1-9
  compressionAlgorithm?: 'gzip' | 'brotli';
  blockSize?: number; // bytes
  checksumAlgorithm?: 'sha256' | 'sha512';
}

export interface IDeltaApplicationResult {
  success: boolean;
  outputSize: number;
  checksum: string;
  error?: string;
  appliedAt: Date;
}

export interface IUpdateMetrics {
  deploymentId: string;
  averageDownloadTime: number;
  averageInstallTime: number;
  successRate: number;
  failureRate: number;
  rollbackRate: number;
  bandwidthSaved: number; // bytes (from delta updates)
  totalDevices: number;
}

// Deployment Strategy Executors
export interface IDeploymentExecutor {
  execute(
    devices: string[],
    updatePackage: IUpdatePackage,
    config: IDeploymentConfig,
  ): Promise<IDeploymentProgress>;
  
  pause(deploymentId: string): Promise<void>;
  resume(deploymentId: string): Promise<void>;
  cancel(deploymentId: string): Promise<void>;
  rollback(deploymentId: string): Promise<void>;
}

// Event types for real-time updates
export interface IUpdateEvent {
  type: 'STARTED' | 'PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  deviceId: string;
  deploymentId: string;
  timestamp: Date;
  data?: any;
}

