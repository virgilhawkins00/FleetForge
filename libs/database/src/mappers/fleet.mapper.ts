/**
 * Fleet Mapper - Converts between Domain Entity and MongoDB Document
 */

import { Fleet, IFleetMetadata, IFleetStatistics } from '@fleetforge/core';
import { FleetDocument, FleetModel } from '../schemas';

export class FleetMapper {
  /**
   * Convert MongoDB Document to Domain Entity
   */
  static toDomain(doc: FleetDocument): Fleet {
    const metadata: IFleetMetadata = {
      description: doc.metadata?.description,
      region: doc.metadata?.region,
      timezone: doc.metadata?.timezone,
      customFields: doc.metadata?.customFields,
    };

    const statistics: IFleetStatistics | undefined = doc.statistics
      ? {
          totalDevices: doc.statistics.totalDevices,
          activeDevices: doc.statistics.activeDevices,
          offlineDevices: doc.statistics.offlineDevices,
          errorDevices: doc.statistics.errorDevices,
          averageBatteryLevel: doc.statistics.averageBatteryLevel,
          lastUpdated: doc.statistics.lastUpdated,
        }
      : undefined;

    return new Fleet(
      doc._id,
      doc.name,
      doc.organizationId,
      metadata,
      doc.deviceIds,
      doc.tags,
      doc.createdAt,
      doc.updatedAt,
      statistics,
    );
  }

  /**
   * Convert Domain Entity to MongoDB Document format
   */
  static toPersistence(entity: Fleet): Partial<FleetModel> {
    return {
      _id: entity.id,
      name: entity.name,
      organizationId: entity.organizationId,
      metadata: {
        description: entity.metadata?.description,
        region: entity.metadata?.region,
        timezone: entity.metadata?.timezone,
        customFields: entity.metadata?.customFields,
      },
      deviceIds: entity.deviceIds,
      tags: entity.tags,
      statistics: entity.statistics
        ? {
            totalDevices: entity.statistics.totalDevices,
            activeDevices: entity.statistics.activeDevices,
            offlineDevices: entity.statistics.offlineDevices,
            errorDevices: entity.statistics.errorDevices,
            averageBatteryLevel: entity.statistics.averageBatteryLevel,
            lastUpdated: entity.statistics.lastUpdated,
          }
        : undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

