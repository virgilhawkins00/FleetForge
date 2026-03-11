/**
 * ShadowsService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ShadowsService } from './shadows.service';
import { DeviceShadowRepository, DeviceRepository } from '@fleetforge/database';

describe('ShadowsService', () => {
  let service: ShadowsService;
  let shadowRepo: jest.Mocked<DeviceShadowRepository>;
  let deviceRepo: jest.Mocked<DeviceRepository>;

  const mockShadow = {
    id: 'shadow-123',
    deviceId: 'device-1',
    state: { desired: {}, reported: {}, delta: {} },
    metadata: {},
    version: 1,
    hasDelta: false,
    delta: {},
    updateReported: jest.fn(),
    updateDesired: jest.fn(),
    toJSON: jest.fn().mockReturnValue({
      id: 'shadow-123',
      deviceId: 'device-1',
      state: { desired: {}, reported: {}, delta: {} },
      metadata: {},
      version: 1,
      hasDelta: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };

  const mockDevice = { id: 'device-1', name: 'Test Device' };

  beforeEach(async () => {
    const mockShadowRepo = {
      findByDeviceId: jest.fn(),
      getOrCreate: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      markSynced: jest.fn(),
      delete: jest.fn(),
      findWithPendingDeltas: jest.fn(),
    };

    const mockDeviceRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShadowsService,
        { provide: DeviceShadowRepository, useValue: mockShadowRepo },
        { provide: DeviceRepository, useValue: mockDeviceRepo },
      ],
    }).compile();

    service = module.get<ShadowsService>(ShadowsService);
    shadowRepo = module.get(DeviceShadowRepository);
    deviceRepo = module.get(DeviceRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getShadow', () => {
    it('should return shadow for device', async () => {
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      shadowRepo.getOrCreate.mockResolvedValue(mockShadow as any);

      const result = await service.getShadow('device-1');

      expect(result.deviceId).toBe('device-1');
    });

    it('should throw NotFoundException when device not found', async () => {
      deviceRepo.findById.mockResolvedValue(null);

      await expect(service.getShadow('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateReported', () => {
    it('should update reported state', async () => {
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      shadowRepo.findByDeviceId.mockResolvedValue(mockShadow as any);
      shadowRepo.save.mockResolvedValue(mockShadow as any);

      await service.updateReported('device-1', { state: { temperature: 25 } });

      expect(mockShadow.updateReported).toHaveBeenCalledWith({ temperature: 25 });
    });

    it('should create shadow if not exists', async () => {
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      shadowRepo.findByDeviceId.mockResolvedValue(null);
      shadowRepo.create.mockResolvedValue(mockShadow as any);
      shadowRepo.save.mockResolvedValue(mockShadow as any);

      await service.updateReported('device-1', { state: { temperature: 25 } });

      expect(shadowRepo.create).toHaveBeenCalled();
    });
  });

  describe('updateDesired', () => {
    it('should update desired state', async () => {
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      shadowRepo.findByDeviceId.mockResolvedValue(mockShadow as any);
      shadowRepo.save.mockResolvedValue(mockShadow as any);

      await service.updateDesired('device-1', { state: { ledOn: true } });

      expect(mockShadow.updateDesired).toHaveBeenCalledWith({ ledOn: true });
    });

    it('should create shadow if not exists for updateDesired', async () => {
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      shadowRepo.findByDeviceId.mockResolvedValue(null);
      shadowRepo.create.mockResolvedValue(mockShadow as any);
      shadowRepo.save.mockResolvedValue(mockShadow as any);

      await service.updateDesired('device-1', { state: { ledOn: true } });

      expect(shadowRepo.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when device not found for updateDesired', async () => {
      deviceRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateDesired('nonexistent', { state: { ledOn: true } }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDelta', () => {
    it('should return delta', async () => {
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      shadowRepo.findByDeviceId.mockResolvedValue(mockShadow as any);

      const result = await service.getDelta('device-1');

      expect(result).toEqual({});
    });

    it('should return empty object when no shadow', async () => {
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      shadowRepo.findByDeviceId.mockResolvedValue(null);

      const result = await service.getDelta('device-1');

      expect(result).toEqual({});
    });
  });

  describe('markSynced', () => {
    it('should mark shadow as synced', async () => {
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      shadowRepo.markSynced.mockResolvedValue(mockShadow as any);

      const result = await service.markSynced('device-1');

      expect(result.deviceId).toBe('device-1');
    });

    it('should throw NotFoundException when shadow not found', async () => {
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      shadowRepo.markSynced.mockResolvedValue(null);

      await expect(service.markSynced('device-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteShadow', () => {
    it('should delete shadow', async () => {
      shadowRepo.delete.mockResolvedValue(undefined);

      await service.deleteShadow('device-1');

      expect(shadowRepo.delete).toHaveBeenCalledWith('device-1');
    });
  });
});
