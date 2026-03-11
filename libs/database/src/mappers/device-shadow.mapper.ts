/**
 * Device Shadow Mapper
 * Maps between DeviceShadow domain entity and MongoDB document
 */

import { DeviceShadow, IShadowState } from '@fleetforge/core';
import { DeviceShadowDocument } from '../schemas/device-shadow.schema';

export class DeviceShadowMapper {
  /**
   * Map MongoDB document to domain entity
   */
  static toDomain(doc: DeviceShadowDocument): DeviceShadow {
    const reported: IShadowState = {
      state: doc.reported?.state || {},
      metadata: doc.reported?.metadata
        ? {
            timestamp: doc.reported.metadata.timestamp,
            version: doc.reported.metadata.version,
          }
        : undefined,
    };

    const desired: IShadowState = {
      state: doc.desired?.state || {},
      metadata: doc.desired?.metadata
        ? {
            timestamp: doc.desired.metadata.timestamp,
            version: doc.desired.metadata.version,
          }
        : undefined,
    };

    return new DeviceShadow(
      doc._id,
      doc.deviceId,
      reported,
      desired,
      doc.delta || {},
      doc.hasDelta || false,
      doc.version,
      doc.createdAt,
      doc.updatedAt,
      doc.lastReportedAt,
      doc.lastDesiredAt,
      doc.lastSyncedAt,
    );
  }

  /**
   * Map domain entity to MongoDB document format
   */
  static toPersistence(shadow: DeviceShadow): Record<string, unknown> {
    return {
      _id: shadow.id,
      deviceId: shadow.deviceId,
      reported: {
        state: shadow.reported.state,
        metadata: shadow.reported.metadata
          ? {
              timestamp: shadow.reported.metadata.timestamp,
              version: shadow.reported.metadata.version,
            }
          : undefined,
      },
      desired: {
        state: shadow.desired.state,
        metadata: shadow.desired.metadata
          ? {
              timestamp: shadow.desired.metadata.timestamp,
              version: shadow.desired.metadata.version,
            }
          : undefined,
      },
      delta: shadow.delta,
      hasDelta: shadow.hasDelta,
      version: shadow.version,
      lastReportedAt: shadow.lastReportedAt,
      lastDesiredAt: shadow.lastDesiredAt,
      lastSyncedAt: shadow.lastSyncedAt,
    };
  }
}

