/**
 * DevicesService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DeviceRepository } from '@fleetforge/database';
import { DeviceStatus, DeviceType } from '@fleetforge/core';

describe('DevicesService', () => {
  let service: DevicesService;
  let deviceRepo: jest.Mocked<DeviceRepository>;

  const mockDevice = {
    id: 'device-123',
    fleetId: 'fleet-1',
    name: 'Test Device',
    type: DeviceType.SENSOR,
    status: DeviceStatus.ACTIVE,
    metadata: {
      manufacturer: 'Test Corp',
      model: 'T-100',
      hardwareVersion: '1.0',
      serialNumber: 'SN123456',
    },
    capabilities: {
      hasGPS: true,
      hasCamera: false,
      hasCellular: true,
      hasWiFi: false,
      hasBluetooth: true,
      sensors: ['accelerometer'],
    },
    firmwareVersion: '1.0.0',
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    location: null,
    health: null,
    tags: [],
    isOnline: jest.fn().mockReturnValue(true),
    isHealthy: jest.fn().mockReturnValue(true),
    updateHealth: jest.fn(),
  };

  beforeEach(async () => {
    const mockDeviceRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DevicesService, { provide: DeviceRepository, useValue: mockDeviceRepo }],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    deviceRepo = module.get(DeviceRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a device', async () => {
      deviceRepo.create.mockResolvedValue(mockDevice as any);

      const result = await service.create({
        fleetId: 'fleet-1',
        name: 'Test Device',
        type: 'SENSOR',
        firmwareVersion: '1.0.0',
        metadata: {
          manufacturer: 'Test Corp',
          model: 'T-100',
          hardwareVersion: '1.0',
          serialNumber: 'SN123456',
        },
        capabilities: {
          hasGPS: true,
          hasCamera: false,
          hasCellular: true,
          hasWiFi: false,
          hasBluetooth: true,
          sensors: ['accelerometer'],
        },
      });

      expect(result.name).toBe('Test Device');
      expect(deviceRepo.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return array of devices', async () => {
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);

      const result = await service.findAll({}, 100, 0);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('device-123');
    });

    it('should filter by fleetId', async () => {
      deviceRepo.findMany.mockResolvedValue([mockDevice as any]);

      await service.findAll({ fleetId: 'fleet-1' }, 100, 0);

      expect(deviceRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ fleetId: 'fleet-1' }),
        100,
        0,
      );
    });
  });

  describe('findOne', () => {
    it('should return a device by id', async () => {
      deviceRepo.findById.mockResolvedValue(mockDevice as any);

      const result = await service.findOne('device-123');

      expect(result.id).toBe('device-123');
    });

    it('should throw NotFoundException when device not found', async () => {
      deviceRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a device', async () => {
      const updatedDevice = { ...mockDevice, name: 'Updated Device' };
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue(updatedDevice as any);

      const result = await service.update('device-123', { name: 'Updated Device' });

      expect(result.name).toBe('Updated Device');
    });

    it('should throw NotFoundException when device not found', async () => {
      deviceRepo.findById.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update device status', async () => {
      const updatedDevice = { ...mockDevice, status: DeviceStatus.MAINTENANCE };
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue(updatedDevice as any);

      const result = await service.update('device-123', { status: 'MAINTENANCE' });

      expect(result.status).toBe(DeviceStatus.MAINTENANCE);
    });

    it('should update device tags', async () => {
      const updatedDevice = { ...mockDevice, tags: ['tag1', 'tag2'] };
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue(updatedDevice as any);

      const result = await service.update('device-123', { tags: ['tag1', 'tag2'] });

      expect(result.tags).toEqual(['tag1', 'tag2']);
    });

    it('should update device firmware version', async () => {
      const updatedDevice = { ...mockDevice, firmwareVersion: '2.0.0' };
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue(updatedDevice as any);

      const result = await service.update('device-123', { firmwareVersion: '2.0.0' });

      expect(result.firmwareVersion).toBe('2.0.0');
    });

    it('should update multiple fields at once', async () => {
      const updatedDevice = {
        ...mockDevice,
        name: 'New Name',
        status: DeviceStatus.SUSPENDED,
        tags: ['prod'],
        firmwareVersion: '3.0.0',
      };
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue(updatedDevice as any);

      const result = await service.update('device-123', {
        name: 'New Name',
        status: 'SUSPENDED',
        tags: ['prod'],
        firmwareVersion: '3.0.0',
      });

      expect(result.name).toBe('New Name');
      expect(result.firmwareVersion).toBe('3.0.0');
    });
  });

  describe('remove', () => {
    it('should remove a device', async () => {
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.delete.mockResolvedValue(undefined);

      await service.remove('device-123');

      expect(deviceRepo.delete).toHaveBeenCalledWith('device-123');
    });

    it('should throw NotFoundException when device not found', async () => {
      deviceRepo.findById.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLocation', () => {
    it('should update device location', async () => {
      const updatedDevice = { ...mockDevice, location: { latitude: 10, longitude: 20 } };
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue(updatedDevice as any);

      await service.updateLocation('device-123', {
        latitude: 10,
        longitude: 20,
      });

      expect(deviceRepo.update).toHaveBeenCalled();
    });

    it('should update device location with altitude', async () => {
      const updatedDevice = {
        ...mockDevice,
        location: { latitude: 10, longitude: 20, altitude: 100 },
      };
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue(updatedDevice as any);

      await service.updateLocation('device-123', {
        latitude: 10,
        longitude: 20,
        altitude: 100,
      });

      expect(deviceRepo.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when device not found', async () => {
      deviceRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateLocation('nonexistent', { latitude: 10, longitude: 20 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateHealth', () => {
    it('should update device health', async () => {
      const updatedDevice = { ...mockDevice, health: { batteryLevel: 80 } };
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue(updatedDevice as any);

      await service.updateHealth('device-123', { batteryLevel: 80 });

      expect(mockDevice.updateHealth).toHaveBeenCalledWith({ batteryLevel: 80 });
      expect(deviceRepo.update).toHaveBeenCalled();
    });

    it('should update device health with all fields', async () => {
      const healthData = {
        batteryLevel: 80,
        signalStrength: 75,
        temperature: 35,
        memoryUsage: 50,
        cpuUsage: 30,
      };
      const updatedDevice = { ...mockDevice, health: healthData };
      deviceRepo.findById.mockResolvedValue(mockDevice as any);
      deviceRepo.update.mockResolvedValue(updatedDevice as any);

      await service.updateHealth('device-123', healthData);

      expect(mockDevice.updateHealth).toHaveBeenCalledWith(healthData);
    });

    it('should throw NotFoundException when device not found', async () => {
      deviceRepo.findById.mockResolvedValue(null);

      await expect(service.updateHealth('nonexistent', { batteryLevel: 80 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('count', () => {
    it('should count devices', async () => {
      deviceRepo.count.mockResolvedValue(10);

      const result = await service.count({});

      expect(result).toBe(10);
    });

    it('should count devices with fleetId filter', async () => {
      deviceRepo.count.mockResolvedValue(5);

      const result = await service.count({ fleetId: 'fleet-1' });

      expect(result).toBe(5);
      expect(deviceRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({ fleetId: 'fleet-1' }),
      );
    });

    it('should count devices with status filter', async () => {
      deviceRepo.count.mockResolvedValue(3);

      const result = await service.count({ status: 'ACTIVE' });

      expect(result).toBe(3);
      expect(deviceRepo.count).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE' }));
    });
  });
});
