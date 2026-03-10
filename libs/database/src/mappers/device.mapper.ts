/**
 * Device Mapper - Converts between Domain Entity and MongoDB Document
 */

import {
  Device,
  IDeviceMetadata,
  IDeviceCapabilities,
  IDeviceHealth,
  ILocation,
} from '@fleetforge/core';
import { DeviceDocument, DeviceModel } from '../schemas';

export class DeviceMapper {
  /**
   * Convert MongoDB Document to Domain Entity
   */
  static toDomain(doc: DeviceDocument): Device {
    const location: ILocation | undefined = doc.location
      ? {
          latitude: doc.location.latitude,
          longitude: doc.location.longitude,
          altitude: doc.location.altitude,
          accuracy: doc.location.accuracy,
          speed: doc.location.speed,
          heading: doc.location.heading,
          timestamp: doc.location.timestamp,
        }
      : undefined;

    const health: IDeviceHealth | undefined = doc.health
      ? {
          batteryLevel: doc.health.batteryLevel,
          signalStrength: doc.health.signalStrength,
          temperature: doc.health.temperature,
          memoryUsage: doc.health.memoryUsage,
          cpuUsage: doc.health.cpuUsage,
          lastHealthCheck: doc.health.lastHealthCheck,
        }
      : undefined;

    const metadata: IDeviceMetadata = {
      manufacturer: doc.metadata.manufacturer,
      model: doc.metadata.model,
      hardwareVersion: doc.metadata.hardwareVersion,
      serialNumber: doc.metadata.serialNumber,
      manufactureDate: doc.metadata.manufactureDate,
    };

    const capabilities: IDeviceCapabilities = {
      hasGPS: doc.capabilities.hasGPS,
      hasCamera: doc.capabilities.hasCamera,
      hasCellular: doc.capabilities.hasCellular,
      hasWiFi: doc.capabilities.hasWiFi,
      hasBluetooth: doc.capabilities.hasBluetooth,
      sensors: doc.capabilities.sensors,
    };

    return new Device(
      doc._id,
      doc.fleetId,
      doc.name,
      doc.type,
      doc.status,
      metadata,
      capabilities,
      doc.firmwareVersion,
      doc.lastSeen,
      location,
      health,
      doc.tags,
      doc.createdAt,
      doc.updatedAt,
    );
  }

  /**
   * Convert Domain Entity to MongoDB Document format
   */
  static toPersistence(entity: Device): Partial<DeviceModel> {
    return {
      _id: entity.id,
      fleetId: entity.fleetId,
      name: entity.name,
      type: entity.type,
      status: entity.status,
      metadata: {
        manufacturer: entity.metadata.manufacturer,
        model: entity.metadata.model,
        hardwareVersion: entity.metadata.hardwareVersion,
        serialNumber: entity.metadata.serialNumber,
        manufactureDate: entity.metadata.manufactureDate,
      },
      capabilities: {
        hasGPS: entity.capabilities.hasGPS,
        hasCamera: entity.capabilities.hasCamera,
        hasCellular: entity.capabilities.hasCellular,
        hasWiFi: entity.capabilities.hasWiFi,
        hasBluetooth: entity.capabilities.hasBluetooth,
        sensors: entity.capabilities.sensors,
      },
      firmwareVersion: entity.firmwareVersion,
      lastSeen: entity.lastSeen,
      location: entity.location
        ? {
            latitude: entity.location.latitude,
            longitude: entity.location.longitude,
            altitude: entity.location.altitude,
            accuracy: entity.location.accuracy,
            speed: entity.location.speed,
            heading: entity.location.heading,
            timestamp: entity.location.timestamp,
          }
        : undefined,
      health: entity.health
        ? {
            batteryLevel: entity.health.batteryLevel,
            signalStrength: entity.health.signalStrength,
            temperature: entity.health.temperature,
            memoryUsage: entity.health.memoryUsage,
            cpuUsage: entity.health.cpuUsage,
            lastHealthCheck: entity.health.lastHealthCheck,
          }
        : undefined,
      tags: entity.tags,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
