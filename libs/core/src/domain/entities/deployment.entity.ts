/**
 * Deployment Entity - Represents a firmware deployment campaign
 */

import { DeploymentStatus, DeploymentStrategy } from '../enums';

export interface IDeploymentTarget {
  deviceIds?: string[];
  fleetIds?: string[];
  tags?: string[];
  percentage?: number;
}

/**
 * Canary Strategy Configuration
 * Controls how canary deployments are executed
 */
export interface ICanaryConfig {
  /** Percentage of devices for canary phase (default: 5%) */
  percentage?: number;
  /** Observation time in minutes before promotion (default: 30) */
  observationTimeMinutes?: number;
  /** Minimum success rate to promote to full rollout (default: 95%) */
  successThreshold?: number;
  /** Auto-promote to full rollout if canary succeeds */
  autoPromote?: boolean;
  /** Health check interval in seconds during observation */
  healthCheckIntervalSeconds?: number;
}

/**
 * Rolling Strategy Configuration
 * Controls batch-based gradual rollouts
 */
export interface IRollingConfig {
  /** Number of devices per batch (default: 10% of total) */
  batchSize?: number;
  /** Batch size as percentage (alternative to absolute count) */
  batchPercentage?: number;
  /** Delay between batches in minutes (default: 5) */
  batchDelayMinutes?: number;
  /** Maximum concurrent batches (default: 1) */
  maxConcurrentBatches?: number;
  /** Health verification between batches */
  verifyHealthBetweenBatches?: boolean;
  /** Pause deployment if batch failure rate exceeds threshold */
  pauseOnBatchFailure?: boolean;
  /** Batch failure threshold percentage (default: 10%) */
  batchFailureThreshold?: number;
}

/**
 * Phased/Wave Strategy Configuration
 * Controls multi-phase deployments with approval gates
 */
export interface IPhasedConfig {
  /** Wave definitions with percentages */
  waves?: IDeploymentWave[];
  /** Default number of phases if waves not specified (default: 5) */
  phaseCount?: number;
  /** Delay between phases in minutes (default: 60) */
  phaseDelayMinutes?: number;
  /** Require manual approval between phases */
  requireApproval?: boolean;
  /** Auto-advance to next phase if success rate met */
  autoAdvance?: boolean;
  /** Minimum success rate to advance (default: 90%) */
  advanceThreshold?: number;
}

/**
 * Wave definition for phased deployments
 */
export interface IDeploymentWave {
  /** Wave name (e.g., "Pilot", "Early Adopters", "General") */
  name: string;
  /** Percentage of remaining devices */
  percentage: number;
  /** Minimum wait time after previous wave in minutes */
  delayMinutes?: number;
  /** Require manual approval for this wave */
  requireApproval?: boolean;
  /** Target specific tags/groups for this wave */
  targetTags?: string[];
}

export interface IDeploymentConfig {
  strategy: DeploymentStrategy;
  target: IDeploymentTarget;
  scheduledAt?: Date;
  /** @deprecated Use canary.percentage instead */
  canaryPercentage?: number;
  /** @deprecated Use phased.phaseCount instead */
  phaseCount?: number;
  /** @deprecated Use phased.phaseDelayMinutes instead */
  phaseDuration?: number; // in minutes
  autoRollback?: boolean;
  rollbackThreshold?: number; // failure percentage

  /** Canary strategy configuration */
  canary?: ICanaryConfig;
  /** Rolling strategy configuration */
  rolling?: IRollingConfig;
  /** Phased/Wave strategy configuration */
  phased?: IPhasedConfig;
}

export interface IDeploymentProgress {
  total: number;
  pending: number;
  inProgress: number;
  succeeded: number;
  failed: number;
  rolledBack: number;
}

export class Deployment {
  constructor(
    public readonly id: string,
    public readonly firmwareId: string,
    public readonly firmwareVersion: string,
    public name: string,
    public status: DeploymentStatus,
    public config: IDeploymentConfig,
    public progress: IDeploymentProgress,
    public readonly createdBy: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public startedAt?: Date,
    public completedAt?: Date,
    public errors: string[] = [],
  ) {}

  /**
   * Start deployment
   */
  start(): void {
    if (this.status !== DeploymentStatus.PENDING) {
      throw new Error(`Cannot start deployment with status: ${this.status}`);
    }

    this.status = DeploymentStatus.IN_PROGRESS;
    this.startedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Update deployment progress
   */
  updateProgress(progress: Partial<IDeploymentProgress>): void {
    this.progress = { ...this.progress, ...progress };
    this.updatedAt = new Date();

    // Auto-complete if all devices processed
    if (this.progress.pending === 0 && this.progress.inProgress === 0) {
      this.complete();
    }
  }

  /**
   * Complete deployment
   */
  complete(): void {
    if (this.status !== DeploymentStatus.IN_PROGRESS) {
      throw new Error(`Cannot complete deployment with status: ${this.status}`);
    }

    const hasFailures = this.progress.failed > 0;
    const allSucceeded = this.progress.succeeded === this.progress.total;

    if (allSucceeded) {
      this.status = DeploymentStatus.COMPLETED;
    } else if (hasFailures) {
      this.status = DeploymentStatus.PARTIAL;
    }

    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Cancel deployment
   */
  cancel(): void {
    if (this.status !== DeploymentStatus.PENDING && this.status !== DeploymentStatus.IN_PROGRESS) {
      throw new Error(`Cannot cancel deployment with status: ${this.status}`);
    }

    this.status = DeploymentStatus.CANCELLED;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Rollback deployment
   */
  rollback(reason: string): void {
    if (this.status !== DeploymentStatus.IN_PROGRESS) {
      throw new Error(`Cannot rollback deployment with status: ${this.status}`);
    }

    this.status = DeploymentStatus.ROLLED_BACK;
    this.errors.push(`Rollback: ${reason}`);
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Check if deployment should auto-rollback
   */
  shouldAutoRollback(): boolean {
    if (!this.config.autoRollback || !this.config.rollbackThreshold) {
      return false;
    }

    const failureRate = (this.progress.failed / this.progress.total) * 100;
    return failureRate >= this.config.rollbackThreshold;
  }

  /**
   * Get deployment success rate
   */
  getSuccessRate(): number {
    if (this.progress.total === 0) return 0;
    return (this.progress.succeeded / this.progress.total) * 100;
  }

  /**
   * Get deployment duration in minutes
   */
  getDurationMinutes(): number | null {
    if (!this.startedAt) return null;
    const endTime = this.completedAt || new Date();
    return Math.floor((endTime.getTime() - this.startedAt.getTime()) / (1000 * 60));
  }

  /**
   * Check if deployment is scheduled
   */
  isScheduled(): boolean {
    return (
      this.config.strategy === DeploymentStrategy.SCHEDULED &&
      this.config.scheduledAt !== undefined &&
      this.config.scheduledAt > new Date()
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      firmwareId: this.firmwareId,
      firmwareVersion: this.firmwareVersion,
      name: this.name,
      status: this.status,
      config: this.config,
      progress: this.progress,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      errors: this.errors,
    };
  }
}
