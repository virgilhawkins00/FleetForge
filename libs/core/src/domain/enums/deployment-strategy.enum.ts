/**
 * Deployment Strategy Enumeration
 * Defines how firmware updates are rolled out to devices
 */

export enum DeploymentStrategy {
  /** Deploy to all devices immediately */
  IMMEDIATE = 'IMMEDIATE',

  /** Deploy to a small percentage first (canary) */
  CANARY = 'CANARY',

  /** Deploy in phases/waves */
  PHASED = 'PHASED',

  /** Deploy to specific devices only */
  TARGETED = 'TARGETED',

  /** Schedule deployment for later */
  SCHEDULED = 'SCHEDULED',

  /** Rolling deployment - gradual rollout with batches */
  ROLLING = 'ROLLING',

  /** Blue-green deployment - switch between two environments */
  BLUE_GREEN = 'BLUE_GREEN',
}

export enum DeploymentStatus {
  /** Deployment is pending */
  PENDING = 'PENDING',

  /** Deployment is in progress */
  IN_PROGRESS = 'IN_PROGRESS',

  /** Deployment completed successfully */
  COMPLETED = 'COMPLETED',

  /** Deployment partially completed */
  PARTIAL = 'PARTIAL',

  /** Deployment failed */
  FAILED = 'FAILED',

  /** Deployment was cancelled */
  CANCELLED = 'CANCELLED',

  /** Deployment was rolled back */
  ROLLED_BACK = 'ROLLED_BACK',
}
