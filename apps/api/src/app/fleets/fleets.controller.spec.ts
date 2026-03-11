/**
 * FleetsController Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FleetsController } from './fleets.controller';
import { FleetsService } from './fleets.service';

describe('FleetsController', () => {
  let controller: FleetsController;
  let service: jest.Mocked<FleetsService>;

  const mockFleet = {
    id: 'fleet-1',
    name: 'Test Fleet',
    organizationId: 'org-1',
    description: 'Test fleet description',
    deviceCount: 10,
    tags: ['production'],
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByOrganization: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addDevice: jest.fn(),
      removeDevice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FleetsController],
      providers: [{ provide: FleetsService, useValue: mockService }],
    }).compile();

    controller = module.get<FleetsController>(FleetsController);
    service = module.get(FleetsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create fleet', async () => {
      service.create.mockResolvedValue(mockFleet as any);

      const result = await controller.create({
        name: 'Test Fleet',
        organizationId: 'org-1',
        metadata: { description: 'Test fleet description' },
      });

      expect(result.name).toBe('Test Fleet');
      expect(service.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return list of fleets', async () => {
      service.findAll.mockResolvedValue([mockFleet as any]);

      const result = await controller.findAll('org-1', ['production'], 10, 0);

      expect(result).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalledWith(
        { organizationId: 'org-1', tags: ['production'] },
        10,
        0,
      );
    });
  });

  describe('findOne', () => {
    it('should return fleet by id', async () => {
      service.findOne.mockResolvedValue(mockFleet as any);

      const result = await controller.findOne('fleet-1');

      expect(result.id).toBe('fleet-1');
    });
  });

  describe('findByOrganization', () => {
    it('should return fleets by organization', async () => {
      service.findByOrganization.mockResolvedValue([mockFleet as any]);

      const result = await controller.findByOrganization('org-1');

      expect(result).toHaveLength(1);
      expect(service.findByOrganization).toHaveBeenCalledWith('org-1');
    });
  });

  describe('update', () => {
    it('should update fleet', async () => {
      const updated = { ...mockFleet, name: 'Updated Fleet' };
      service.update.mockResolvedValue(updated as any);

      const result = await controller.update('fleet-1', { name: 'Updated Fleet' });

      expect(result.name).toBe('Updated Fleet');
    });
  });

  describe('remove', () => {
    it('should remove fleet', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('fleet-1');

      expect(service.remove).toHaveBeenCalledWith('fleet-1');
    });
  });

  describe('addDevice', () => {
    it('should add device to fleet', async () => {
      const updated = { ...mockFleet, deviceIds: ['device-1', 'device-2'] };
      service.addDevice.mockResolvedValue(updated as any);

      const result = await controller.addDevice('fleet-1', 'device-1');

      expect(result.deviceIds).toContain('device-2');
      expect(service.addDevice).toHaveBeenCalledWith('fleet-1', 'device-1');
    });
  });

  describe('removeDevice', () => {
    it('should remove device from fleet', async () => {
      const updated = { ...mockFleet, deviceIds: [] };
      service.removeDevice.mockResolvedValue(updated as any);

      const result = await controller.removeDevice('fleet-1', 'device-1');

      expect(result.deviceIds).toHaveLength(0);
      expect(service.removeDevice).toHaveBeenCalledWith('fleet-1', 'device-1');
    });
  });
});
