/**
 * Telemetry Mapper - Converts between Domain Entity and MongoDB Document
 */

import { Telemetry, ITelemetrySensor, ILocation } from '@fleetforge/core';
import { TelemetryDocument, TelemetryModel } from '../schemas';

export class TelemetryMapper {
  /**
   * Convert MongoDB Document to Domain Entity
   */
  static toDomain(doc: TelemetryDocument): Telemetry {
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

    const sensors: ITelemetrySensor[] = doc.sensors.map((s) => ({
      name: s.name,
      value: s.value,
      unit: s.unit,
      timestamp: s.timestamp,
    }));

    return new Telemetry(
      doc._id,
      doc.deviceId,
      doc.timestamp,
      location,
      doc.data,
      sensors,
      doc.batteryLevel,
      doc.signalStrength,
      doc.receivedAt,
    );
  }

  /**
   * Convert Domain Entity to MongoDB Document format
   */
  static toPersistence(entity: Telemetry): Partial<TelemetryModel> {
    return {
      _id: entity.id,
      deviceId: entity.deviceId,
      timestamp: entity.timestamp,
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
      data: entity.data,
      sensors: entity.sensors.map((s) => ({
        name: s.name,
        value: s.value,
        unit: s.unit,
        timestamp: s.timestamp,
      })),
      batteryLevel: entity.batteryLevel,
      signalStrength: entity.signalStrength,
      receivedAt: entity.receivedAt,
    };
  }
}
