/**
 * DeviceDeployment Mapper - Converts between Domain Entity and MongoDB Document
 */

import {
  DeviceDeployment,
  DeviceDeploymentStatus,
  IDeviceDeploymentError,
  IDeviceDeploymentMetrics,
} from '@fleetforge/core';
import { DeviceDeploymentDocument, DeviceDeploymentModel } from '../schemas';

export class DeviceDeploymentMapper {
  /**
   * Convert MongoDB Document to Domain Entity
   */
  static toDomain(doc: DeviceDeploymentDocument): DeviceDeployment {
    const metrics: IDeviceDeploymentMetrics = {
      downloadStartedAt: doc.metrics.downloadStartedAt,
      downloadCompletedAt: doc.metrics.downloadCompletedAt,
      installStartedAt: doc.metrics.installStartedAt,
      installCompletedAt: doc.metrics.installCompletedAt,
      downloadDurationMs: doc.metrics.downloadDurationMs,
      installDurationMs: doc.metrics.installDurationMs,
      downloadRetries: doc.metrics.downloadRetries ?? 0,
      installRetries: doc.metrics.installRetries ?? 0,
    };

    const errors: IDeviceDeploymentError[] = (doc.errors ?? []).map((e) => ({
      code: e.code,
      message: e.message,
      timestamp: e.timestamp,
      retryable: e.retryable,
    }));

    return new DeviceDeployment(
      doc._id,
      doc.deploymentId,
      doc.deviceId,
      doc.firmwareId,
      doc.status as DeviceDeploymentStatus,
      doc.previousFirmwareVersion ?? null,
      doc.targetFirmwareVersion,
      doc.progress,
      metrics,
      errors,
      doc.createdAt,
      doc.updatedAt,
      doc.completedAt,
      doc.rollbackReason,
    );
  }

  /**
   * Convert Domain Entity to MongoDB Document format
   */
  static toPersistence(entity: DeviceDeployment): Partial<DeviceDeploymentModel> {
    return {
      _id: entity.id,
      deploymentId: entity.deploymentId,
      deviceId: entity.deviceId,
      firmwareId: entity.firmwareId,
      status: entity.status,
      previousFirmwareVersion: entity.previousFirmwareVersion ?? undefined,
      targetFirmwareVersion: entity.targetFirmwareVersion,
      progress: entity.progress,
      metrics: {
        downloadStartedAt: entity.metrics.downloadStartedAt,
        downloadCompletedAt: entity.metrics.downloadCompletedAt,
        installStartedAt: entity.metrics.installStartedAt,
        installCompletedAt: entity.metrics.installCompletedAt,
        downloadDurationMs: entity.metrics.downloadDurationMs,
        installDurationMs: entity.metrics.installDurationMs,
        downloadRetries: entity.metrics.downloadRetries,
        installRetries: entity.metrics.installRetries,
      },
      errors: entity.errors.map((e) => ({
        code: e.code,
        message: e.message,
        timestamp: e.timestamp,
        retryable: e.retryable,
      })),
      completedAt: entity.completedAt,
      rollbackReason: entity.rollbackReason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

