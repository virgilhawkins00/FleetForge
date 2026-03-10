/**
 * Firmware Repository Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FirmwareRepository } from './firmware.repository';
import { FirmwareModel, FirmwareDocument } from '../schemas';
import { FirmwareStatus, FirmwareType } from '@fleetforge/core';

describe('FirmwareRepository', () => {
  let repository: FirmwareRepository;
  let mockModel: Partial<Model<FirmwareDocument>>;

  const mockFirmwareDoc = {
    _id: 'firmware-123',
    version: '2.5.0',
    name: 'Test Firmware',
    type: FirmwareType.FULL,
    status: FirmwareStatus.DEPLOYED,
    file: {
      url: 'https://test.com/fw.bin',
      size: 1024,
      checksum: 'abc123',
      checksumAlgorithm: 'SHA-256',
    },
    signature: {
      algorithm: 'RSA-SHA256',
      signature: 'sig',
      publicKey: 'key',
      timestamp: new Date(),
    },
    metadata: { deviceTypes: ['TRACKER'], releaseNotes: 'Test' },
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockModel = {
      findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockFirmwareDoc) }),
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockFirmwareDoc),
      }),
      find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockFirmwareDoc]),
      }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(mockFirmwareDoc) }),
      findByIdAndDelete: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirmwareRepository,
        { provide: getModelToken(FirmwareModel.name), useValue: mockModel },
      ],
    }).compile();

    repository = module.get<FirmwareRepository>(FirmwareRepository);
  });

  describe('findById', () => {
    it('should return firmware by id', async () => {
      const result = await repository.findById('firmware-123');

      expect(result?.id).toBe('firmware-123');
    });

    it('should return null if not found', async () => {
      (mockModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByVersion', () => {
    it('should return firmware by version', async () => {
      const result = await repository.findByVersion('2.5.0');

      expect(mockModel.findOne).toHaveBeenCalledWith({ version: '2.5.0' });
      expect(result?.version).toBe('2.5.0');
    });

    it('should return null if version not found', async () => {
      (mockModel.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findByVersion('9.9.9');

      expect(result).toBeNull();
    });
  });

  describe('findLatest', () => {
    it('should return latest firmware for device type', async () => {
      const result = await repository.findLatest('TRACKER');

      expect(result).toBeDefined();
    });

    it('should return null if no firmware found', async () => {
      (mockModel.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findLatest('UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should return firmwares with filter', async () => {
      const result = await repository.findMany({ status: FirmwareStatus.DEPLOYED });

      expect(result).toHaveLength(1);
    });

    it('should apply type filter', async () => {
      await repository.findMany({ type: FirmwareType.DELTA });

      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should apply deviceTypes filter', async () => {
      await repository.findMany({ deviceTypes: ['TRACKER'] });

      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should apply createdBy filter', async () => {
      await repository.findMany({ createdBy: 'user-123' });

      expect(mockModel.find).toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should return count', async () => {
      const result = await repository.count({});

      expect(result).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete firmware', async () => {
      await repository.delete('firmware-123');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('firmware-123');
    });
  });

  describe('update', () => {
    it('should throw error if firmware not found', async () => {
      (mockModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(repository.update('nonexistent', { name: 'New' })).rejects.toThrow(
        'Firmware not found',
      );
    });

    it('should update firmware with all fields', async () => {
      const result = await repository.update('firmware-123', {
        name: 'Updated Firmware',
        status: FirmwareStatus.DEPRECATED,
      });

      expect(result).toBeDefined();
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a new firmware', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockFirmwareDoc);
      const MockFirmwareModel = jest.fn().mockImplementation(() => ({ save: mockSave }));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FirmwareRepository,
          { provide: getModelToken(FirmwareModel.name), useValue: MockFirmwareModel },
        ],
      }).compile();

      const repo = module.get<FirmwareRepository>(FirmwareRepository);
      const mockFirmware = {
        id: 'firmware-123',
        version: '2.5.0',
        name: 'Test Firmware',
        type: FirmwareType.FULL,
        status: FirmwareStatus.DEPLOYED,
        file: {
          url: 'https://test.com/fw.bin',
          size: 1024,
          checksum: 'abc123',
          checksumAlgorithm: 'SHA-256',
        },
        signature: {
          algorithm: 'RSA-SHA256',
          signature: 'sig',
          publicKey: 'key',
          timestamp: new Date(),
        },
        metadata: { deviceTypes: ['TRACKER'] },
        createdBy: 'user-123',
      } as any;

      const result = await repo.create(mockFirmware);

      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
