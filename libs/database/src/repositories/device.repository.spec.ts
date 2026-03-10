/**
 * Device Repository Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeviceRepository } from './device.repository';
import { DeviceModel, DeviceDocument } from '../schemas';
import { DeviceStatus, DeviceType } from '@fleetforge/core';

describe('DeviceRepository', () => {
  let repository: DeviceRepository;
  let mockModel: Partial<Model<DeviceDocument>>;

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
    },
    capabilities: {
      hasGPS: true,
      hasCamera: false,
      hasCellular: true,
      hasWiFi: true,
      hasBluetooth: false,
      sensors: ['temperature'],
    },
    firmwareVersion: '2.0.0',
    lastSeen: new Date(),
    tags: ['production'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockModel = {
      findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDeviceDoc) }),
      find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockDeviceDoc]),
      }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDeviceDoc) }),
      findByIdAndDelete: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
      updateMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 2 }) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceRepository,
        { provide: getModelToken(DeviceModel.name), useValue: mockModel },
      ],
    }).compile();

    repository = module.get<DeviceRepository>(DeviceRepository);
  });

  describe('findById', () => {
    it('should return a device by id', async () => {
      const result = await repository.findById('device-123');

      expect(mockModel.findById).toHaveBeenCalledWith('device-123');
      expect(result).toBeDefined();
      expect(result?.id).toBe('device-123');
    });

    it('should return null if device not found', async () => {
      (mockModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should return devices with filter', async () => {
      const result = await repository.findMany({ fleetId: 'fleet-456' }, 10, 0);

      expect(mockModel.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should apply status filter', async () => {
      await repository.findMany({ status: DeviceStatus.ACTIVE });

      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should apply tags filter', async () => {
      await repository.findMany({ tags: ['production', 'critical'] });

      expect(mockModel.find).toHaveBeenCalled();
    });
  });

  describe('findByFleetId', () => {
    it('should return devices by fleet', async () => {
      const result = await repository.findByFleetId('fleet-456');

      expect(result).toHaveLength(1);
    });
  });

  describe('count', () => {
    it('should return count of devices', async () => {
      const result = await repository.count({});

      expect(result).toBe(1);
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update multiple devices', async () => {
      const result = await repository.bulkUpdateStatus(
        ['device-1', 'device-2'],
        DeviceStatus.OFFLINE,
      );

      expect(result).toBe(2);
    });
  });

  describe('delete', () => {
    it('should delete device by id', async () => {
      await repository.delete('device-123');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('device-123');
    });
  });

  describe('findDevicesNeedingUpdate', () => {
    it('should find devices needing update', async () => {
      const result = await repository.findDevicesNeedingUpdate('3.0.0');

      expect(mockModel.find).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a new device', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockDeviceDoc);
      const MockDeviceModel = jest.fn().mockImplementation(() => ({ save: mockSave }));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DeviceRepository,
          { provide: getModelToken(DeviceModel.name), useValue: MockDeviceModel },
        ],
      }).compile();

      const repo = module.get<DeviceRepository>(DeviceRepository);
      const mockDevice = {
        id: 'device-123',
        fleetId: 'fleet-456',
        name: 'Test Device',
        type: DeviceType.TRACKER,
        status: DeviceStatus.ACTIVE,
        metadata: {
          manufacturer: 'TestCorp',
          model: 'T-1000',
          hardwareVersion: '1.0.0',
          serialNumber: 'SN-123456',
        },
        capabilities: {
          hasGPS: true,
          hasCamera: false,
          hasCellular: true,
          hasWiFi: true,
          hasBluetooth: false,
          sensors: ['temperature'],
        },
        firmwareVersion: '2.0.0',
        tags: ['production'],
      } as any;

      const result = await repo.create(mockDevice);

      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update device with all fields', async () => {
      const result = await repository.update('device-123', {
        name: 'Updated Device',
        status: DeviceStatus.OFFLINE,
        firmwareVersion: '3.0.0',
        lastSeen: new Date(),
        location: { latitude: -23.55, longitude: -46.63, timestamp: new Date() } as any,
        health: {
          batteryLevel: 80,
          signalStrength: -70,
          temperature: 40,
          memoryUsage: 256,
          cpuUsage: 15,
          lastHealthCheck: new Date(),
        } as any,
        tags: ['updated'],
      });

      expect(result).toBeDefined();
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw error if device not found', async () => {
      (mockModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(repository.update('nonexistent', { name: 'New Name' })).rejects.toThrow(
        'Device not found',
      );
    });
  });

  describe('findMany with filters', () => {
    it('should apply firmwareVersion filter', async () => {
      await repository.findMany({ firmwareVersion: '2.0.0' });

      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should apply online=true filter', async () => {
      await repository.findMany({ online: true });

      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should apply online=false filter', async () => {
      await repository.findMany({ online: false });

      expect(mockModel.find).toHaveBeenCalled();
    });
  });
});
