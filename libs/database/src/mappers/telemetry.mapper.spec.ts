/**
 * Telemetry Mapper Tests
 */

import { Telemetry } from '@fleetforge/core';
import { TelemetryMapper } from './telemetry.mapper';

describe('TelemetryMapper', () => {
  const mockTelemetryDoc = {
    _id: 'telemetry-123',
    deviceId: 'device-456',
    timestamp: new Date('2024-06-01T10:00:00Z'),
    location: {
      latitude: -23.5505,
      longitude: -46.6333,
      altitude: 760,
      accuracy: 5,
      speed: 60,
      heading: 270,
      timestamp: new Date('2024-06-01T10:00:00Z'),
    },
    data: {
      engineTemp: 85,
      fuelLevel: 0.65,
      doorOpen: false,
    },
    sensors: [
      { name: 'temperature', value: 25.5, unit: 'C', timestamp: new Date('2024-06-01T10:00:00Z') },
      { name: 'humidity', value: 60, unit: '%', timestamp: new Date('2024-06-01T10:00:00Z') },
    ],
    batteryLevel: 92,
    signalStrength: -55,
    receivedAt: new Date('2024-06-01T10:00:01Z'),
  } as any;

  describe('toDomain', () => {
    it('should convert document to domain entity', () => {
      const telemetry = TelemetryMapper.toDomain(mockTelemetryDoc);

      expect(telemetry).toBeInstanceOf(Telemetry);
      expect(telemetry.id).toBe('telemetry-123');
      expect(telemetry.deviceId).toBe('device-456');
    });

    it('should map location correctly', () => {
      const telemetry = TelemetryMapper.toDomain(mockTelemetryDoc);

      expect(telemetry.location).toBeDefined();
      expect(telemetry.location?.latitude).toBe(-23.5505);
      expect(telemetry.location?.longitude).toBe(-46.6333);
      expect(telemetry.location?.speed).toBe(60);
    });

    it('should map data correctly', () => {
      const telemetry = TelemetryMapper.toDomain(mockTelemetryDoc);

      expect(telemetry.data['engineTemp']).toBe(85);
      expect(telemetry.data['fuelLevel']).toBe(0.65);
      expect(telemetry.data['doorOpen']).toBe(false);
    });

    it('should map sensors correctly', () => {
      const telemetry = TelemetryMapper.toDomain(mockTelemetryDoc);

      expect(telemetry.sensors).toHaveLength(2);
      expect(telemetry.sensors[0].name).toBe('temperature');
      expect(telemetry.sensors[0].value).toBe(25.5);
    });

    it('should map batteryLevel and signalStrength', () => {
      const telemetry = TelemetryMapper.toDomain(mockTelemetryDoc);

      expect(telemetry.batteryLevel).toBe(92);
      expect(telemetry.signalStrength).toBe(-55);
    });

    it('should handle missing location', () => {
      const docWithoutLocation = { ...mockTelemetryDoc, location: undefined };
      const telemetry = TelemetryMapper.toDomain(docWithoutLocation);

      expect(telemetry.location).toBeUndefined();
    });
  });

  describe('toPersistence', () => {
    it('should convert domain entity to persistence format', () => {
      const telemetry = TelemetryMapper.toDomain(mockTelemetryDoc);
      const persistence = TelemetryMapper.toPersistence(telemetry);

      expect(persistence._id).toBe('telemetry-123');
      expect(persistence.deviceId).toBe('device-456');
    });

    it('should map location to persistence', () => {
      const telemetry = TelemetryMapper.toDomain(mockTelemetryDoc);
      const persistence = TelemetryMapper.toPersistence(telemetry);

      expect(persistence.location?.latitude).toBe(-23.5505);
      expect(persistence.location?.longitude).toBe(-46.6333);
    });

    it('should map sensors to persistence', () => {
      const telemetry = TelemetryMapper.toDomain(mockTelemetryDoc);
      const persistence = TelemetryMapper.toPersistence(telemetry);

      expect(persistence.sensors).toHaveLength(2);
      expect(persistence.sensors?.[0].name).toBe('temperature');
    });

    it('should handle undefined location', () => {
      const docWithoutLocation = { ...mockTelemetryDoc, location: undefined };
      const telemetry = TelemetryMapper.toDomain(docWithoutLocation);
      const persistence = TelemetryMapper.toPersistence(telemetry);

      expect(persistence.location).toBeUndefined();
    });

    it('should map all location fields to persistence', () => {
      const telemetry = TelemetryMapper.toDomain(mockTelemetryDoc);
      const persistence = TelemetryMapper.toPersistence(telemetry);

      expect(persistence.location?.altitude).toBe(760);
      expect(persistence.location?.accuracy).toBe(5);
      expect(persistence.location?.speed).toBe(60);
      expect(persistence.location?.heading).toBe(270);
      expect(persistence.location?.timestamp).toBeDefined();
    });

    it('should map data to persistence', () => {
      const telemetry = TelemetryMapper.toDomain(mockTelemetryDoc);
      const persistence = TelemetryMapper.toPersistence(telemetry);

      expect(persistence.data?.['engineTemp']).toBe(85);
      expect(persistence.data?.['fuelLevel']).toBe(0.65);
      expect(persistence.data?.['doorOpen']).toBe(false);
    });

    it('should map batteryLevel and signalStrength to persistence', () => {
      const telemetry = TelemetryMapper.toDomain(mockTelemetryDoc);
      const persistence = TelemetryMapper.toPersistence(telemetry);

      expect(persistence.batteryLevel).toBe(92);
      expect(persistence.signalStrength).toBe(-55);
    });

    it('should map receivedAt to persistence', () => {
      const telemetry = TelemetryMapper.toDomain(mockTelemetryDoc);
      const persistence = TelemetryMapper.toPersistence(telemetry);

      expect(persistence.receivedAt).toBeDefined();
    });
  });
});
