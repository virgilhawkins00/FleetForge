/**
 * DevicesController Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DeviceStatus, DeviceType } from '@fleetforge/core';

describe('DevicesController', () => {
  let controller: DevicesController;
  let service: jest.Mocked<DevicesService>;

  const mockDevice = {
    id: 'device-1',
    name: 'Test Device',
    type: DeviceType.TRACKER,
    status: DeviceStatus.ACTIVE,
    firmwareVersion: '1.0.0',
    fleetId: 'fleet-1',
    tags: ['production'],
    metadata: {},
    capabilities: { hasGPS: true, hasBluetooth: false },
    health: { batteryLevel: 80, signalStrength: 75 },
    location: { latitude: 40.7128, longitude: -74.006 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      updateLocation: jest.fn(),
      updateHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [{ provide: DevicesService, useValue: mockService }],
    }).compile();

    controller = module.get<DevicesController>(DevicesController);
    service = module.get(DevicesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a device', async () => {
      service.create.mockResolvedValue(mockDevice as any);

      const result = await controller.create({
        name: 'Test Device',
        fleetId: 'fleet-1',
        type: DeviceType.TRACKER,
        firmwareVersion: '1.0.0',
        metadata: {
          manufacturer: 'Acme',
          model: 'T-1000',
          hardwareVersion: '1.0',
          serialNumber: 'SN123',
        },
        capabilities: {
          hasGPS: true,
          hasCamera: false,
          hasCellular: true,
          hasWiFi: false,
          hasBluetooth: false,
          sensors: [],
        },
      });

      expect(result.name).toBe('Test Device');
      expect(service.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return list of devices', async () => {
      service.findAll.mockResolvedValue([mockDevice as any]);

      const result = await controller.findAll('fleet-1', 'active', 10, 0);

      expect(result).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalledWith({ fleetId: 'fleet-1', status: 'active' }, 10, 0);
    });
  });

  describe('findOne', () => {
    it('should return device by id', async () => {
      service.findOne.mockResolvedValue(mockDevice as any);

      const result = await controller.findOne('device-1');

      expect(result.id).toBe('device-1');
      expect(service.findOne).toHaveBeenCalledWith('device-1');
    });
  });

  describe('update', () => {
    it('should update device', async () => {
      const updated = { ...mockDevice, name: 'Updated Device' };
      service.update.mockResolvedValue(updated as any);

      const result = await controller.update('device-1', { name: 'Updated Device' });

      expect(result.name).toBe('Updated Device');
      expect(service.update).toHaveBeenCalledWith('device-1', { name: 'Updated Device' });
    });
  });

  describe('remove', () => {
    it('should remove device', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('device-1');

      expect(service.remove).toHaveBeenCalledWith('device-1');
    });
  });

  describe('updateLocation', () => {
    it('should update device location', async () => {
      const updated = { ...mockDevice, location: { latitude: 41.0, longitude: -75.0 } };
      service.updateLocation.mockResolvedValue(updated as any);

      const result = await controller.updateLocation('device-1', {
        latitude: 41.0,
        longitude: -75.0,
      });

      expect(result.location?.latitude).toBe(41.0);
      expect(service.updateLocation).toHaveBeenCalledWith('device-1', {
        latitude: 41.0,
        longitude: -75.0,
      });
    });
  });

  describe('updateHealth', () => {
    it('should update device health', async () => {
      const updated = { ...mockDevice, health: { batteryLevel: 90, signalStrength: 80 } };
      service.updateHealth.mockResolvedValue(updated as any);

      const result = await controller.updateHealth('device-1', {
        batteryLevel: 90,
        signalStrength: 80,
      });

      expect(result.health?.batteryLevel).toBe(90);
      expect(service.updateHealth).toHaveBeenCalledWith('device-1', {
        batteryLevel: 90,
        signalStrength: 80,
      });
    });
  });
});
