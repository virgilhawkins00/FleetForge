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

export interface IDeploymentConfig {
  strategy: DeploymentStrategy;
  target: IDeploymentTarget;
  scheduledAt?: Date;
  canaryPercentage?: number;
  phaseCount?: number;
  phaseDuration?: number; // in minutes
  autoRollback?: boolean;
  rollbackThreshold?: number; // failure percentage
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
    if (
      this.status !== DeploymentStatus.PENDING &&
      this.status !== DeploymentStatus.IN_PROGRESS
    ) {
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

