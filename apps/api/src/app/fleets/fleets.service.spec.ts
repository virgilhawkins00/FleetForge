/**
 * FleetsService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FleetsService } from './fleets.service';
import { FleetRepository } from '@fleetforge/database';

describe('FleetsService', () => {
  let service: FleetsService;
  let fleetRepo: jest.Mocked<FleetRepository>;

  const mockFleet = {
    id: 'fleet-123',
    name: 'Test Fleet',
    organizationId: 'org-1',
    metadata: {},
    deviceIds: ['device-1', 'device-2'],
    tags: ['production'],
    statistics: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    getHealthPercentage: jest.fn().mockReturnValue(100),
    isHealthy: jest.fn().mockReturnValue(true),
    addDevice: jest.fn(),
    removeDevice: jest.fn(),
  };

  beforeEach(async () => {
    const mockFleetRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      findByOrganization: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FleetsService, { provide: FleetRepository, useValue: mockFleetRepo }],
    }).compile();

    service = module.get<FleetsService>(FleetsService);
    fleetRepo = module.get(FleetRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a fleet', async () => {
      fleetRepo.create.mockResolvedValue(mockFleet as any);

      const result = await service.create({
        name: 'Test Fleet',
        organizationId: 'org-1',
      });

      expect(result.name).toBe('Test Fleet');
      expect(fleetRepo.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return array of fleets', async () => {
      fleetRepo.findMany.mockResolvedValue([mockFleet as any]);

      const result = await service.findAll({}, 100, 0);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('fleet-123');
    });
  });

  describe('findOne', () => {
    it('should return a fleet by id', async () => {
      fleetRepo.findById.mockResolvedValue(mockFleet as any);

      const result = await service.findOne('fleet-123');

      expect(result.id).toBe('fleet-123');
    });

    it('should throw NotFoundException when fleet not found', async () => {
      fleetRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByOrganization', () => {
    it('should return fleets by organization', async () => {
      fleetRepo.findByOrganization.mockResolvedValue([mockFleet as any]);

      const result = await service.findByOrganization('org-1');

      expect(result).toHaveLength(1);
      expect(fleetRepo.findByOrganization).toHaveBeenCalledWith('org-1');
    });
  });

  describe('update', () => {
    it('should update a fleet', async () => {
      const updatedFleet = { ...mockFleet, name: 'Updated Fleet' };
      fleetRepo.findById.mockResolvedValue(mockFleet as any);
      fleetRepo.update.mockResolvedValue(updatedFleet as any);

      const result = await service.update('fleet-123', { name: 'Updated Fleet' });

      expect(result.name).toBe('Updated Fleet');
    });

    it('should throw NotFoundException when fleet not found', async () => {
      fleetRepo.findById.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update only metadata when provided', async () => {
      const updatedFleet = { ...mockFleet, metadata: { region: 'us-east' } };
      fleetRepo.findById.mockResolvedValue(mockFleet as any);
      fleetRepo.update.mockResolvedValue(updatedFleet as any);

      const result = await service.update('fleet-123', { metadata: { region: 'us-east' } });

      expect(result).toBeDefined();
      expect(fleetRepo.update).toHaveBeenCalled();
    });

    it('should update only tags when provided', async () => {
      const updatedFleet = { ...mockFleet, tags: ['new-tag'] };
      fleetRepo.findById.mockResolvedValue(mockFleet as any);
      fleetRepo.update.mockResolvedValue(updatedFleet as any);

      const result = await service.update('fleet-123', { tags: ['new-tag'] });

      expect(result).toBeDefined();
      expect(fleetRepo.update).toHaveBeenCalled();
    });

    it('should update only deviceIds when provided', async () => {
      const updatedFleet = { ...mockFleet, deviceIds: ['device-new'] };
      fleetRepo.findById.mockResolvedValue(mockFleet as any);
      fleetRepo.update.mockResolvedValue(updatedFleet as any);

      const result = await service.update('fleet-123', { deviceIds: ['device-new'] });

      expect(result).toBeDefined();
      expect(fleetRepo.update).toHaveBeenCalled();
    });

    it('should update all fields when all provided', async () => {
      const updatedFleet = {
        ...mockFleet,
        name: 'Updated',
        metadata: { region: 'eu' },
        tags: ['tag1'],
        deviceIds: ['dev1'],
      };
      fleetRepo.findById.mockResolvedValue(mockFleet as any);
      fleetRepo.update.mockResolvedValue(updatedFleet as any);

      const result = await service.update('fleet-123', {
        name: 'Updated',
        metadata: { region: 'eu' },
        tags: ['tag1'],
        deviceIds: ['dev1'],
      });

      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should remove a fleet', async () => {
      fleetRepo.findById.mockResolvedValue(mockFleet as any);
      fleetRepo.delete.mockResolvedValue(undefined);

      await service.remove('fleet-123');

      expect(fleetRepo.delete).toHaveBeenCalledWith('fleet-123');
    });

    it('should throw NotFoundException when fleet not found', async () => {
      fleetRepo.findById.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addDevice', () => {
    it('should add device to fleet', async () => {
      const updatedFleet = { ...mockFleet, deviceIds: [...mockFleet.deviceIds, 'device-3'] };
      fleetRepo.findById.mockResolvedValue(mockFleet as any);
      fleetRepo.update.mockResolvedValue(updatedFleet as any);

      await service.addDevice('fleet-123', 'device-3');

      expect(mockFleet.addDevice).toHaveBeenCalledWith('device-3');
    });

    it('should throw NotFoundException when fleet not found', async () => {
      fleetRepo.findById.mockResolvedValue(null);

      await expect(service.addDevice('nonexistent', 'device-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeDevice', () => {
    it('should remove device from fleet', async () => {
      const updatedFleet = { ...mockFleet, deviceIds: ['device-2'] };
      fleetRepo.findById.mockResolvedValue(mockFleet as any);
      fleetRepo.update.mockResolvedValue(updatedFleet as any);

      await service.removeDevice('fleet-123', 'device-1');

      expect(mockFleet.removeDevice).toHaveBeenCalledWith('device-1');
    });

    it('should throw NotFoundException when fleet not found', async () => {
      fleetRepo.findById.mockResolvedValue(null);

      await expect(service.removeDevice('nonexistent', 'device-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('count', () => {
    it('should count fleets', async () => {
      fleetRepo.count.mockResolvedValue(10);

      const result = await service.count({});

      expect(result).toBe(10);
    });

    it('should count fleets by organization', async () => {
      fleetRepo.count.mockResolvedValue(5);

      const result = await service.count({ organizationId: 'org-1' });

      expect(result).toBe(5);
      expect(fleetRepo.count).toHaveBeenCalledWith({ organizationId: 'org-1' });
    });
  });
});
