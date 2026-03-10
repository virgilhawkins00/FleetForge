/**
 * Deployment Mapper - Converts between Domain Entity and MongoDB Document
 */

import {
  Deployment,
  IDeploymentConfig,
  IDeploymentProgress,
  IDeploymentTarget,
} from '@fleetforge/core';
import { DeploymentDocument, DeploymentModel } from '../schemas';

export class DeploymentMapper {
  /**
   * Convert MongoDB Document to Domain Entity
   */
  static toDomain(doc: DeploymentDocument): Deployment {
    const target: IDeploymentTarget = {
      deviceIds: doc.config.target.deviceIds,
      fleetIds: doc.config.target.fleetIds,
      tags: doc.config.target.tags,
      percentage: doc.config.target.percentage,
    };

    const config: IDeploymentConfig = {
      strategy: doc.config.strategy,
      target,
      scheduledAt: doc.config.scheduledAt,
      canaryPercentage: doc.config.canaryPercentage,
      phaseCount: doc.config.phaseCount,
      phaseDuration: doc.config.phaseDuration,
      autoRollback: doc.config.autoRollback,
      rollbackThreshold: doc.config.rollbackThreshold,
    };

    const progress: IDeploymentProgress = {
      total: doc.progress.total,
      pending: doc.progress.pending,
      inProgress: doc.progress.inProgress,
      succeeded: doc.progress.succeeded,
      failed: doc.progress.failed,
      rolledBack: doc.progress.rolledBack,
    };

    return new Deployment(
      doc._id,
      doc.firmwareId,
      doc.firmwareVersion,
      doc.name,
      doc.status,
      config,
      progress,
      doc.createdBy,
      doc.createdAt,
      doc.updatedAt,
      doc.startedAt,
      doc.completedAt,
      doc.errors,
    );
  }

  /**
   * Convert Domain Entity to MongoDB Document format
   */
  static toPersistence(entity: Deployment): Partial<DeploymentModel> {
    return {
      _id: entity.id,
      firmwareId: entity.firmwareId,
      firmwareVersion: entity.firmwareVersion,
      name: entity.name,
      status: entity.status,
      config: {
        strategy: entity.config.strategy,
        target: {
          deviceIds: entity.config.target.deviceIds,
          fleetIds: entity.config.target.fleetIds,
          tags: entity.config.target.tags,
          percentage: entity.config.target.percentage,
        },
        scheduledAt: entity.config.scheduledAt,
        canaryPercentage: entity.config.canaryPercentage,
        phaseCount: entity.config.phaseCount,
        phaseDuration: entity.config.phaseDuration,
        autoRollback: entity.config.autoRollback,
        rollbackThreshold: entity.config.rollbackThreshold,
      },
      progress: {
        total: entity.progress.total,
        pending: entity.progress.pending,
        inProgress: entity.progress.inProgress,
        succeeded: entity.progress.succeeded,
        failed: entity.progress.failed,
        rolledBack: entity.progress.rolledBack,
      },
      createdBy: entity.createdBy,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt,
      errors: entity.errors,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

