/**
 * FirmwareService Unit Tests
 */

/// <reference types="multer" />

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FirmwareService } from './firmware.service';
import { FirmwareRepository } from '@fleetforge/database';
import { StorageService } from './services/storage.service';
import { FirmwareValidationService } from './services/firmware-validation.service';
import { FirmwareStatus, FirmwareType, IStoredFile } from '@fleetforge/core';

// Helper to create mock Multer file (using any to avoid Express namespace issues in tests)
function createMockFile(overrides: Record<string, unknown> = {}): any {
  return {
    fieldname: 'file',
    originalname: 'firmware.bin',
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    size: 1024,
    buffer: Buffer.from('test'),
    stream: {},
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

// Helper to create mock stored file
function createMockStoredFile(data: Partial<IStoredFile> = {}): IStoredFile {
  return {
    key: 'firmware/1.0.0/firmware.bin',
    url: 'http://test.com/firmware.bin',
    size: 1024,
    checksum: 'checksum123',
    checksumAlgorithm: 'sha256',
    bucket: 'firmware-bucket',
    contentType: 'application/octet-stream',
    uploadedAt: new Date(),
    ...data,
  };
}

describe('FirmwareService', () => {
  let service: FirmwareService;
  let firmwareRepo: jest.Mocked<FirmwareRepository>;

  const mockFirmware = {
    id: 'fw-123',
    version: '1.0.0',
    name: 'Test Firmware',
    type: 'APPLICATION',
    status: FirmwareStatus.READY,
    file: {
      url: 'http://test.com/fw.bin',
      size: 1024,
      checksum: 'abc123',
      checksumAlgorithm: 'sha256',
    },
    signature: { algorithm: 'RSA-SHA256', signature: 'sig', publicKey: 'key' },
    metadata: {},
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
    updateStatus: jest.fn(),
    isReadyForDeployment: jest.fn().mockReturnValue(true),
    getAgeInDays: jest.fn().mockReturnValue(5),
  };

  beforeEach(async () => {
    const mockFirmwareRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByVersion: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const mockStorageService = {
      upload: jest.fn(),
      download: jest.fn(),
      exists: jest.fn(),
    };

    const mockValidationService = {
      validateFirmware: jest.fn(),
      calculateChecksum: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirmwareService,
        { provide: FirmwareRepository, useValue: mockFirmwareRepo },
        { provide: StorageService, useValue: mockStorageService },
        { provide: FirmwareValidationService, useValue: mockValidationService },
      ],
    }).compile();

    service = module.get<FirmwareService>(FirmwareService);
    firmwareRepo = module.get(FirmwareRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create firmware', async () => {
      firmwareRepo.create.mockResolvedValue(mockFirmware as any);

      const result = await service.create({
        version: '1.0.0',
        name: 'Test Firmware',
        type: FirmwareType.FULL,
        file: { url: 'http://test.com', size: 1024, checksum: 'abc', checksumAlgorithm: 'sha256' },
        signature: { algorithm: 'RSA-SHA256', signature: 'sig', publicKey: 'key' },
        metadata: { deviceTypes: ['tracker'], releaseNotes: 'Initial release' },
        createdBy: 'user-1',
      });

      expect(result.version).toBe('1.0.0');
      expect(firmwareRepo.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return array of firmwares', async () => {
      firmwareRepo.findMany.mockResolvedValue([mockFirmware as any]);

      const result = await service.findAll({}, 100, 0);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('fw-123');
    });
  });

  describe('findOne', () => {
    it('should return firmware by id', async () => {
      firmwareRepo.findById.mockResolvedValue(mockFirmware as any);

      const result = await service.findOne('fw-123');

      expect(result.id).toBe('fw-123');
    });

    it('should throw NotFoundException when not found', async () => {
      firmwareRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByVersion', () => {
    it('should return firmware by version', async () => {
      firmwareRepo.findByVersion.mockResolvedValue(mockFirmware as any);

      const result = await service.findByVersion('1.0.0');

      expect(result.version).toBe('1.0.0');
    });

    it('should throw NotFoundException when version not found', async () => {
      firmwareRepo.findByVersion.mockResolvedValue(null);

      await expect(service.findByVersion('9.9.9')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update firmware', async () => {
      const updatedFirmware = { ...mockFirmware, name: 'Updated Firmware' };
      firmwareRepo.findById.mockResolvedValue(mockFirmware as any);
      firmwareRepo.update.mockResolvedValue(updatedFirmware as any);

      const result = await service.update('fw-123', { name: 'Updated Firmware' });

      expect(result.name).toBe('Updated Firmware');
    });
  });

  describe('remove', () => {
    it('should remove firmware', async () => {
      firmwareRepo.findById.mockResolvedValue(mockFirmware as any);
      firmwareRepo.delete.mockResolvedValue(undefined);

      await service.remove('fw-123');

      expect(firmwareRepo.delete).toHaveBeenCalledWith('fw-123');
    });
  });

  describe('count', () => {
    it('should return count', async () => {
      firmwareRepo.count.mockResolvedValue(5);

      const result = await service.count({});

      expect(result).toBe(5);
    });
  });

  describe('findCompatible', () => {
    it('should return firmwares compatible with device type', async () => {
      firmwareRepo.findMany.mockResolvedValue([mockFirmware as any]);

      const result = await service.findCompatible('TRACKER');

      expect(result).toHaveLength(1);
      expect(firmwareRepo.findMany).toHaveBeenCalledWith({ deviceTypes: ['TRACKER'] });
    });
  });

  describe('updateStatus', () => {
    it('should update firmware status', async () => {
      const updatedFirmware = { ...mockFirmware, status: FirmwareStatus.READY };
      firmwareRepo.findById.mockResolvedValue(mockFirmware as any);
      firmwareRepo.update.mockResolvedValue(updatedFirmware as any);

      const result = await service.updateStatus('fw-123', FirmwareStatus.READY);

      expect(result.status).toBe(FirmwareStatus.READY);
      expect(mockFirmware.updateStatus).toHaveBeenCalledWith(FirmwareStatus.READY);
    });

    it('should throw NotFoundException when firmware not found', async () => {
      firmwareRepo.findById.mockResolvedValue(null);

      await expect(service.updateStatus('nonexistent', FirmwareStatus.READY)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when firmware not found', async () => {
      firmwareRepo.findById.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when firmware not found', async () => {
      firmwareRepo.findById.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update firmware metadata', async () => {
      const existingFirmware = { ...mockFirmware, metadata: { releaseNotes: 'old' } };
      const updatedFirmware = {
        ...mockFirmware,
        metadata: { releaseNotes: 'new', changelog: 'v2' },
      };
      firmwareRepo.findById.mockResolvedValue(existingFirmware as any);
      firmwareRepo.update.mockResolvedValue(updatedFirmware as any);

      const result = await service.update('fw-123', { metadata: { changelog: 'v2' } });

      expect(firmwareRepo.update).toHaveBeenCalled();
      expect(result.metadata).toEqual({ releaseNotes: 'new', changelog: 'v2' });
    });
  });

  describe('updateStatus with invalid transition', () => {
    it('should throw BadRequestException when status transition fails', async () => {
      const firmwareWithBadUpdate = {
        ...mockFirmware,
        updateStatus: jest.fn().mockImplementation(() => {
          throw new Error('Invalid status transition');
        }),
      };
      firmwareRepo.findById.mockResolvedValue(firmwareWithBadUpdate as any);

      const { BadRequestException } = await import('@nestjs/common');
      await expect(service.updateStatus('fw-123', FirmwareStatus.READY)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('uploadFirmware', () => {
    let storageService: jest.Mocked<StorageService>;
    let validationService: jest.Mocked<FirmwareValidationService>;

    beforeEach(() => {
      storageService = service['storageService'] as jest.Mocked<StorageService>;
      validationService = service['validationService'] as jest.Mocked<FirmwareValidationService>;
    });

    const mockUploadDto = {
      version: '2.0.0',
      name: 'New Firmware',
      type: FirmwareType.FULL,
      deviceTypes: 'TRACKER,SENSOR',
    };

    it('should upload firmware successfully', async () => {
      const mockFile = createMockFile();
      validationService.validateFirmware.mockResolvedValue({
        isValid: true,
        checksumValid: true,
        signatureValid: true,
        errors: [],
        warnings: [],
      });
      storageService.upload.mockResolvedValue(createMockStoredFile());
      firmwareRepo.create.mockResolvedValue(mockFirmware as any);
      firmwareRepo.update.mockResolvedValue(mockFirmware as any);

      const result = await service.uploadFirmware(mockFile, mockUploadDto as any);

      expect(result.version).toBe(mockFirmware.version);
      expect(storageService.upload).toHaveBeenCalled();
    });

    it('should throw BadRequestException when validation fails', async () => {
      const mockFile = createMockFile();
      validationService.validateFirmware.mockResolvedValue({
        isValid: false,
        checksumValid: false,
        signatureValid: false,
        errors: ['Invalid file format'],
        warnings: [],
      });

      await expect(service.uploadFirmware(mockFile, mockUploadDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow upload when skipValidation is true', async () => {
      const mockFile = createMockFile();
      validationService.validateFirmware.mockResolvedValue({
        isValid: false,
        checksumValid: false,
        signatureValid: false,
        errors: ['Invalid file format'],
        warnings: [],
      });
      storageService.upload.mockResolvedValue(createMockStoredFile());
      firmwareRepo.create.mockResolvedValue(mockFirmware as any);

      const result = await service.uploadFirmware(mockFile, {
        ...mockUploadDto,
        skipValidation: true,
      } as any);

      expect(result).toBeDefined();
    });
  });

  describe('downloadFirmware', () => {
    let storageService: jest.Mocked<StorageService>;

    beforeEach(() => {
      storageService = service['storageService'] as jest.Mocked<StorageService>;
    });

    it('should download firmware successfully', async () => {
      storageService.exists.mockResolvedValue(true);
      storageService.download.mockResolvedValue(Buffer.from('firmware data'));

      const result = await service.downloadFirmware('firmware/1.0.0/file.bin');

      expect(result.buffer).toEqual(Buffer.from('firmware data'));
      expect(result.filename).toBe('file.bin');
      expect(result.contentType).toBe('application/octet-stream');
    });

    it('should throw NotFoundException when file does not exist', async () => {
      storageService.exists.mockResolvedValue(false);

      await expect(service.downloadFirmware('nonexistent/file.bin')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateFirmwareFile', () => {
    let validationService: jest.Mocked<FirmwareValidationService>;

    beforeEach(() => {
      validationService = service['validationService'] as jest.Mocked<FirmwareValidationService>;
    });

    it('should validate firmware file', async () => {
      const mockFile = createMockFile({ size: 4 });
      validationService.validateFirmware.mockResolvedValue({
        isValid: true,
        checksumValid: true,
        signatureValid: true,
        errors: [],
        warnings: [],
      });
      validationService.calculateChecksum.mockReturnValue('abc123');

      const result = await service.validateFirmwareFile(mockFile, {});

      expect(result.isValid).toBe(true);
      expect(result.calculatedChecksum).toBe('abc123');
    });
  });

  describe('revalidateFirmware', () => {
    let storageService: jest.Mocked<StorageService>;
    let validationService: jest.Mocked<FirmwareValidationService>;

    beforeEach(() => {
      storageService = service['storageService'] as jest.Mocked<StorageService>;
      validationService = service['validationService'] as jest.Mocked<FirmwareValidationService>;
    });

    it('should revalidate firmware and update status to READY', async () => {
      const validatingFirmware = {
        ...mockFirmware,
        status: FirmwareStatus.VALIDATING,
        file: { ...mockFirmware.file, url: 'http://test.com/download/firmware/1.0.0/file.bin' },
      };
      firmwareRepo.findById.mockResolvedValue(validatingFirmware as any);
      storageService.download.mockResolvedValue(Buffer.from('firmware data'));
      validationService.validateFirmware.mockResolvedValue({
        isValid: true,
        checksumValid: true,
        signatureValid: true,
        errors: [],
        warnings: [],
      });
      validationService.calculateChecksum.mockReturnValue('checksum123');
      firmwareRepo.update.mockResolvedValue(validatingFirmware as any);

      const result = await service.revalidateFirmware('fw-123');

      expect(result.isValid).toBe(true);
      expect(firmwareRepo.update).toHaveBeenCalled();
    });

    it('should update status to FAILED when validation fails', async () => {
      const validatingFirmware = {
        ...mockFirmware,
        status: FirmwareStatus.VALIDATING,
        file: { ...mockFirmware.file, url: 'http://test.com/download/firmware/1.0.0/file.bin' },
      };
      firmwareRepo.findById.mockResolvedValue(validatingFirmware as any);
      storageService.download.mockResolvedValue(Buffer.from('firmware data'));
      validationService.validateFirmware.mockResolvedValue({
        isValid: false,
        checksumValid: false,
        signatureValid: false,
        errors: ['Checksum mismatch'],
        warnings: [],
      });
      validationService.calculateChecksum.mockReturnValue('wrong-checksum');
      firmwareRepo.update.mockResolvedValue(validatingFirmware as any);

      const result = await service.revalidateFirmware('fw-123');

      expect(result.isValid).toBe(false);
      expect(firmwareRepo.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when firmware not found', async () => {
      firmwareRepo.findById.mockResolvedValue(null);

      await expect(service.revalidateFirmware('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should handle URL without download prefix in extractFileKey', async () => {
      const validatingFirmware = {
        ...mockFirmware,
        status: FirmwareStatus.VALIDATING,
        // URL without /download/ prefix - should use fallback path extraction
        file: { ...mockFirmware.file, url: 'http://test.com/firmware/1.0.0/file.bin' },
      };
      firmwareRepo.findById.mockResolvedValue(validatingFirmware as any);
      storageService.download.mockResolvedValue(Buffer.from('firmware data'));
      validationService.validateFirmware.mockResolvedValue({
        isValid: true,
        checksumValid: true,
        signatureValid: true,
        errors: [],
        warnings: [],
      });
      validationService.calculateChecksum.mockReturnValue('checksum123');
      firmwareRepo.update.mockResolvedValue(validatingFirmware as any);

      const result = await service.revalidateFirmware('fw-123');

      expect(result.isValid).toBe(true);
    });
  });

  describe('uploadFirmware - branch coverage', () => {
    let storageService: jest.Mocked<StorageService>;
    let validationService: jest.Mocked<FirmwareValidationService>;

    beforeEach(() => {
      storageService = service['storageService'] as jest.Mocked<StorageService>;
      validationService = service['validationService'] as jest.Mocked<FirmwareValidationService>;
    });

    it('should handle deviceTypes as array (parseDeviceTypes branch)', async () => {
      const mockFile = {
        buffer: Buffer.from('firmware'),
        originalname: 'test.bin',
        mimetype: 'application/octet-stream',
      } as Express.Multer.File;

      validationService.validateFirmware = jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
      });
      validationService.calculateChecksum = jest.fn().mockReturnValue('checksum123');
      storageService.upload = jest.fn().mockResolvedValue({
        url: 'http://test.com/fw.bin',
        key: 'firmware/1.0.0/test.bin',
        size: 1024,
      });
      firmwareRepo.create.mockResolvedValue(mockFirmware as any);

      // Test with deviceTypes as array (covers the Array.isArray branch)
      const result = await service.uploadFirmware(mockFile, {
        version: '1.0.0',
        name: 'Test Firmware',
        type: FirmwareType.FULL,
        deviceTypes: ['sensor', 'gateway'] as any, // Array input
      });

      expect(result).toBeDefined();
    });

    it('should handle deviceTypes as comma-separated string', async () => {
      const mockFile = {
        buffer: Buffer.from('firmware'),
        originalname: 'test.bin',
        mimetype: 'application/octet-stream',
      } as Express.Multer.File;

      validationService.validateFirmware = jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
      });
      validationService.calculateChecksum = jest.fn().mockReturnValue('checksum123');
      storageService.upload = jest.fn().mockResolvedValue({
        url: 'http://test.com/fw.bin',
        key: 'firmware/1.0.0/test.bin',
        size: 1024,
      });
      firmwareRepo.create.mockResolvedValue(mockFirmware as any);

      // Test with deviceTypes as string (covers the split branch)
      const result = await service.uploadFirmware(mockFile, {
        version: '1.0.0',
        name: 'Test Firmware',
        type: FirmwareType.FULL,
        deviceTypes: 'sensor, gateway, controller' as any,
      });

      expect(result).toBeDefined();
    });
  });

  describe('revalidateFirmware - extractFileKey branches', () => {
    let storageService: jest.Mocked<StorageService>;
    let validationService: jest.Mocked<FirmwareValidationService>;

    beforeEach(() => {
      storageService = service['storageService'] as jest.Mocked<StorageService>;
      validationService = service['validationService'] as jest.Mocked<FirmwareValidationService>;
    });

    it('should extract file key using download prefix', async () => {
      const firmwareWithDownloadUrl = {
        ...mockFirmware,
        file: {
          url: 'http://localhost:3100/api/v1/firmware/download/firmware/2.5.0/file.bin',
          size: 1024,
          checksum: 'abc123',
          checksumAlgorithm: 'sha256',
        },
        status: FirmwareStatus.VALIDATING,
        updateStatus: jest.fn(),
      };

      firmwareRepo.findById.mockResolvedValue(firmwareWithDownloadUrl as any);
      storageService.download = jest.fn().mockResolvedValue(Buffer.from('firmware'));
      validationService.validateFirmware = jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
      });
      firmwareRepo.update.mockResolvedValue(firmwareWithDownloadUrl as any);

      const result = await service.revalidateFirmware('fw-123');

      expect(storageService.download).toHaveBeenCalledWith('firmware/2.5.0/file.bin');
      expect(result.isValid).toBe(true);
    });

    it('should extract file key using fallback (last path segments)', async () => {
      const firmwareWithSimpleUrl = {
        ...mockFirmware,
        file: {
          url: 'http://storage.example.com/bucket/firmware/2.5.0/file.bin',
          size: 1024,
          checksum: 'abc123',
          checksumAlgorithm: 'sha256',
        },
        status: FirmwareStatus.VALIDATING,
        updateStatus: jest.fn(),
      };

      firmwareRepo.findById.mockResolvedValue(firmwareWithSimpleUrl as any);
      storageService.download = jest.fn().mockResolvedValue(Buffer.from('firmware'));
      validationService.validateFirmware = jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
      });
      firmwareRepo.update.mockResolvedValue(firmwareWithSimpleUrl as any);

      const result = await service.revalidateFirmware('fw-123');

      // Fallback: uses last 3 path segments
      expect(storageService.download).toHaveBeenCalledWith('firmware/2.5.0/file.bin');
      expect(result.isValid).toBe(true);
    });
  });
});
