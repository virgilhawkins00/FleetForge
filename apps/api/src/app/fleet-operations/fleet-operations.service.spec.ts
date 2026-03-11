/**
 * FleetOperationsService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FleetOperationsService } from './fleet-operations.service';
import { DeviceRepository, DeviceShadowRepository, FleetRepository } from '@fleetforge/database';
import { DeviceLifecycleService } from '../devices/device-lifecycle.service';
import { DeviceStatus } from '@fleetforge/core';

describe('FleetOperationsService', () => {
  let service: FleetOperationsService;
  let deviceRepo: jest.Mocked<DeviceRepository>;
  let shadowRepo: jest.Mocked<DeviceShadowRepository>;
  let fleetRepo: jest.Mocked<FleetRepository>;
  let lifecycleService: jest.Mocked<DeviceLifecycleService>;

  const mockFleet = { id: 'fleet-1', name: 'Test Fleet' };
  const mockDevice = {
    id: 'device-1',
    status: DeviceStatus.ACTIVE,
    tags: ['tag1'],
    isOnline: jest.fn().mockReturnValue(true),
    isHealthy: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const mockDeviceRepo = {
      findMany: jest.fn(),
      findByFleetId: jest.fn(),
      update: jest.fn(),
    };

    const mockShadowRepo = {
      batchUpdateDesired: jest.fn(),
      findByDeviceIds: jest.fn(),
      markSynced: jest.fn(),
    };

    const mockFleetRepo = {
      findById: jest.fn(),
    };

    const mockLifecycleService = {
      batchTransition: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetOperationsService,
        { provide: DeviceRepository, useValue: mockDeviceRepo },
        { provide: DeviceShadowRepository, useValue: mockShadowRepo },
        { provide: FleetRepository, useValue: mockFleetRepo },
        { provide: DeviceLifecycleService, useValue: mockLifecycleService },
      ],
    }).compile();

    service = module.get<FleetOperationsService>(FleetOperationsService);
    deviceRepo = module.get(DeviceRepository);
    shadowRepo = module.get(DeviceShadowRepository);
    fleetRepo = module.get(FleetRepository);
    lifecycleService = module.get(DeviceLifecycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFleetSummary', () => {
    it('should return fleet summary', async () => {
      fleetRepo.findById.mockResolvedValue(mockFleet as any);
      deviceRepo.findByFleetId.mockResolvedValue([mockDevice as any]);

      const result = await service.getFleetSummary('fleet-1');

      expect(result.fleetId).toBe('fleet-1');
      expect(result.fleetName).toBe('Test Fleet');
      expect(result.totalDevices).toBe(1);
      expect(result.onlineCount).toBe(1);
      expect(result.healthyCount).toBe(1);
    });

    it('should throw NotFoundException when fleet not found', async () => {
      fleetRepo.findById.mockResolvedValue(null);

      await expect(service.getFleetSummary('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDevicesByFilter', () => {
    it('should return filtered devices', async () => {
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);

      const result = await service.getDevicesByFilter('fleet-1', { status: DeviceStatus.ACTIVE });

      expect(result).toHaveLength(1);
    });
  });

  describe('batchUpdateDesiredState', () => {
    it('should update desired state for devices', async () => {
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);
      shadowRepo.batchUpdateDesired.mockResolvedValue({ updated: 1, created: 0 });

      const result = await service.batchUpdateDesiredState('fleet-1', { ledOn: true });

      expect(result.updated).toBe(1);
      expect(result.deviceIds).toContain('device-1');
    });

    it('should return empty result when no devices found', async () => {
      deviceRepo.findMany.mockResolvedValue([]);

      const result = await service.batchUpdateDesiredState('fleet-1', { ledOn: true });

      expect(result.updated).toBe(0);
      expect(result.deviceIds).toHaveLength(0);
    });
  });

  describe('batchTransition', () => {
    it('should transition devices', async () => {
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);
      lifecycleService.batchTransition.mockResolvedValue({
        success: [{ device: mockDevice }],
        failed: [],
      } as any);

      const result = await service.batchTransition(
        'fleet-1',
        DeviceStatus.SUSPENDED,
        'Maintenance',
      );

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
    });
  });

  describe('sendCommand', () => {
    it('should send command to fleet devices', async () => {
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);
      shadowRepo.batchUpdateDesired.mockResolvedValue({ updated: 1, created: 0 });

      const result = await service.sendCommand('fleet-1', { command: 'reboot', parameters: {} });

      expect(result.commandId).toMatch(/^cmd-/);
      expect(result.deviceIds).toContain('device-1');
    });
  });

  describe('batchAddTags', () => {
    it('should add tags to devices', async () => {
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, tags: ['tag1', 'tag2'] } as any);

      const result = await service.batchAddTags('fleet-1', ['tag2']);

      expect(result.successCount).toBe(1);
    });

    it('should handle errors when adding tags fails', async () => {
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);
      deviceRepo.update.mockRejectedValue(new Error('Update failed'));

      const result = await service.batchAddTags('fleet-1', ['tag2']);

      expect(result.failedCount).toBe(1);
      expect(result.failed[0].error).toBe('Update failed');
    });

    it('should handle non-Error object rejections', async () => {
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);
      deviceRepo.update.mockRejectedValue('String error');

      const result = await service.batchAddTags('fleet-1', ['tag2']);

      expect(result.failedCount).toBe(1);
      expect(result.failed[0].error).toBe('Unknown error');
    });
  });

  describe('batchRemoveTags', () => {
    it('should remove tags from devices', async () => {
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);
      deviceRepo.update.mockResolvedValue({ ...mockDevice, tags: [] } as any);

      const result = await service.batchRemoveTags('fleet-1', ['tag1']);

      expect(result.successCount).toBe(1);
    });

    it('should handle errors when removing tags fails', async () => {
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);
      deviceRepo.update.mockRejectedValue(new Error('Update failed'));

      const result = await service.batchRemoveTags('fleet-1', ['tag1']);

      expect(result.failedCount).toBe(1);
      expect(result.failed[0].error).toBe('Update failed');
    });

    it('should handle non-Error object rejections', async () => {
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);
      deviceRepo.update.mockRejectedValue('String error');

      const result = await service.batchRemoveTags('fleet-1', ['tag1']);

      expect(result.failedCount).toBe(1);
      expect(result.failed[0].error).toBe('Unknown error');
    });
  });

  describe('getFleetPendingDeltas', () => {
    it('should return shadows with pending deltas', async () => {
      deviceRepo.findByFleetId.mockResolvedValue([mockDevice as any]);
      shadowRepo.findByDeviceIds.mockResolvedValue([
        { deviceId: 'device-1', hasDelta: true },
        { deviceId: 'device-2', hasDelta: false },
      ] as any);

      const result = await service.getFleetPendingDeltas('fleet-1');

      expect(result).toHaveLength(1);
      expect(result[0].hasDelta).toBe(true);
    });
  });

  describe('bulkMarkSynced', () => {
    it('should mark shadows as synced', async () => {
      shadowRepo.markSynced.mockResolvedValue(null);

      const result = await service.bulkMarkSynced(['device-1', 'device-2']);

      expect(result.successCount).toBe(2);
    });

    it('should handle errors when marking synced fails', async () => {
      shadowRepo.markSynced.mockRejectedValue(new Error('Mark failed'));

      const result = await service.bulkMarkSynced(['device-1']);

      expect(result.failedCount).toBe(1);
      expect(result.failed[0].error).toBe('Mark failed');
    });

    it('should handle non-Error object rejections', async () => {
      shadowRepo.markSynced.mockRejectedValue({ code: 500 });

      const result = await service.bulkMarkSynced(['device-1']);

      expect(result.failedCount).toBe(1);
      expect(result.failed[0].error).toBe('Unknown error');
    });
  });
});
