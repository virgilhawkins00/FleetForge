/**
 * Device Mapper Tests
 */

import { Device, DeviceStatus, DeviceType } from '@fleetforge/core';
import { DeviceMapper } from './device.mapper';

describe('DeviceMapper', () => {
  const mockDeviceDoc = {
    _id: 'device-123',
    fleetId: 'fleet-456',
    name: 'Test Device',
    type: DeviceType.TRACKER,
    status: DeviceStatus.ACTIVE,
    metadata: {
      manufacturer: 'TestCorp',
      model: 'T-1000',
      hardwareVersion: '1.0.0',
      serialNumber: 'SN-123456',
      manufactureDate: new Date('2024-01-01'),
    },
    capabilities: {
      hasGPS: true,
      hasCamera: false,
      hasCellular: true,
      hasWiFi: true,
      hasBluetooth: false,
      sensors: ['temperature', 'humidity'],
    },
    firmwareVersion: '2.0.0',
    lastSeen: new Date('2024-06-01T10:00:00Z'),
    location: {
      latitude: -23.5505,
      longitude: -46.6333,
      altitude: 760,
      accuracy: 10,
      speed: 45,
      heading: 180,
      timestamp: new Date('2024-06-01T10:00:00Z'),
    },
    health: {
      batteryLevel: 85,
      signalStrength: -65,
      temperature: 42,
      memoryUsage: 512,
      cpuUsage: 25,
      lastHealthCheck: new Date('2024-06-01T09:55:00Z'),
    },
    tags: ['production', 'fleet-a'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
  } as any;

  describe('toDomain', () => {
    it('should convert document to domain entity', () => {
      const device = DeviceMapper.toDomain(mockDeviceDoc);

      expect(device).toBeInstanceOf(Device);
      expect(device.id).toBe('device-123');
      expect(device.fleetId).toBe('fleet-456');
      expect(device.name).toBe('Test Device');
      expect(device.type).toBe(DeviceType.TRACKER);
      expect(device.status).toBe(DeviceStatus.ACTIVE);
    });

    it('should map metadata correctly', () => {
      const device = DeviceMapper.toDomain(mockDeviceDoc);

      expect(device.metadata.manufacturer).toBe('TestCorp');
      expect(device.metadata.model).toBe('T-1000');
      expect(device.metadata.hardwareVersion).toBe('1.0.0');
      expect(device.metadata.serialNumber).toBe('SN-123456');
    });

    it('should map capabilities correctly', () => {
      const device = DeviceMapper.toDomain(mockDeviceDoc);

      expect(device.capabilities.hasGPS).toBe(true);
      expect(device.capabilities.hasCamera).toBe(false);
      expect(device.capabilities.sensors).toEqual(['temperature', 'humidity']);
    });

    it('should map location correctly', () => {
      const device = DeviceMapper.toDomain(mockDeviceDoc);

      expect(device.location).toBeDefined();
      expect(device.location?.latitude).toBe(-23.5505);
      expect(device.location?.longitude).toBe(-46.6333);
      expect(device.location?.altitude).toBe(760);
    });

    it('should map health correctly', () => {
      const device = DeviceMapper.toDomain(mockDeviceDoc);

      expect(device.health).toBeDefined();
      expect(device.health?.batteryLevel).toBe(85);
      expect(device.health?.signalStrength).toBe(-65);
    });

    it('should handle missing optional fields', () => {
      const minimalDoc = {
        ...mockDeviceDoc,
        location: undefined,
        health: undefined,
      };

      const device = DeviceMapper.toDomain(minimalDoc);

      expect(device.location).toBeUndefined();
      expect(device.health).toBeUndefined();
    });
  });

  describe('toPersistence', () => {
    it('should convert domain entity to persistence format', () => {
      const device = DeviceMapper.toDomain(mockDeviceDoc);
      const persistence = DeviceMapper.toPersistence(device);

      expect(persistence._id).toBe('device-123');
      expect(persistence.fleetId).toBe('fleet-456');
      expect(persistence.name).toBe('Test Device');
    });

    it('should map metadata to persistence', () => {
      const device = DeviceMapper.toDomain(mockDeviceDoc);
      const persistence = DeviceMapper.toPersistence(device);

      expect(persistence.metadata?.manufacturer).toBe('TestCorp');
      expect(persistence.metadata?.model).toBe('T-1000');
    });

    it('should handle undefined location', () => {
      const minimalDoc = { ...mockDeviceDoc, location: undefined };
      const device = DeviceMapper.toDomain(minimalDoc);
      const persistence = DeviceMapper.toPersistence(device);

      expect(persistence.location).toBeUndefined();
    });

    it('should handle undefined health', () => {
      const minimalDoc = { ...mockDeviceDoc, health: undefined };
      const device = DeviceMapper.toDomain(minimalDoc);
      const persistence = DeviceMapper.toPersistence(device);

      expect(persistence.health).toBeUndefined();
    });
  });
});

