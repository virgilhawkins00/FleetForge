/**
 * Fleet Mapper Tests
 */

import { Fleet } from '@fleetforge/core';
import { FleetMapper } from './fleet.mapper';

describe('FleetMapper', () => {
  const mockFleetDoc = {
    _id: 'fleet-123',
    name: 'Test Fleet',
    organizationId: 'org-456',
    metadata: {
      description: 'Test fleet description',
      region: 'south-america',
      timezone: 'America/Sao_Paulo',
      customFields: { priority: 'high' },
    },
    deviceIds: ['device-1', 'device-2', 'device-3'],
    tags: ['production', 'main'],
    statistics: {
      totalDevices: 10,
      activeDevices: 8,
      offlineDevices: 1,
      errorDevices: 1,
      averageBatteryLevel: 75,
      lastUpdated: new Date('2024-06-01T10:00:00Z'),
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
  } as any;

  describe('toDomain', () => {
    it('should convert document to domain entity', () => {
      const fleet = FleetMapper.toDomain(mockFleetDoc);

      expect(fleet).toBeInstanceOf(Fleet);
      expect(fleet.id).toBe('fleet-123');
      expect(fleet.name).toBe('Test Fleet');
      expect(fleet.organizationId).toBe('org-456');
    });

    it('should map metadata correctly', () => {
      const fleet = FleetMapper.toDomain(mockFleetDoc);

      expect(fleet.metadata.description).toBe('Test fleet description');
      expect(fleet.metadata.region).toBe('south-america');
      expect(fleet.metadata.timezone).toBe('America/Sao_Paulo');
    });

    it('should map statistics correctly', () => {
      const fleet = FleetMapper.toDomain(mockFleetDoc);

      expect(fleet.statistics).toBeDefined();
      expect(fleet.statistics?.totalDevices).toBe(10);
      expect(fleet.statistics?.activeDevices).toBe(8);
      expect(fleet.statistics?.offlineDevices).toBe(1);
    });

    it('should handle missing statistics', () => {
      const docWithoutStats = { ...mockFleetDoc, statistics: undefined };
      const fleet = FleetMapper.toDomain(docWithoutStats);

      expect(fleet.statistics).toBeUndefined();
    });

    it('should handle missing metadata fields', () => {
      const docWithPartialMeta = {
        ...mockFleetDoc,
        metadata: { description: 'Just description' },
      };
      const fleet = FleetMapper.toDomain(docWithPartialMeta);

      expect(fleet.metadata.description).toBe('Just description');
      expect(fleet.metadata.region).toBeUndefined();
    });
  });

  describe('toPersistence', () => {
    it('should convert domain entity to persistence format', () => {
      const fleet = FleetMapper.toDomain(mockFleetDoc);
      const persistence = FleetMapper.toPersistence(fleet);

      expect(persistence._id).toBe('fleet-123');
      expect(persistence.name).toBe('Test Fleet');
      expect(persistence.organizationId).toBe('org-456');
    });

    it('should map deviceIds correctly', () => {
      const fleet = FleetMapper.toDomain(mockFleetDoc);
      const persistence = FleetMapper.toPersistence(fleet);

      expect(persistence.deviceIds).toEqual(['device-1', 'device-2', 'device-3']);
    });

    it('should map tags correctly', () => {
      const fleet = FleetMapper.toDomain(mockFleetDoc);
      const persistence = FleetMapper.toPersistence(fleet);

      expect(persistence.tags).toEqual(['production', 'main']);
    });

    it('should handle undefined statistics', () => {
      const docWithoutStats = { ...mockFleetDoc, statistics: undefined };
      const fleet = FleetMapper.toDomain(docWithoutStats);
      const persistence = FleetMapper.toPersistence(fleet);

      expect(persistence.statistics).toBeUndefined();
    });
  });
});

