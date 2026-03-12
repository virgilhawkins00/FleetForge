/**
 * FirmwareController Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, StreamableFile } from '@nestjs/common';
import { FirmwareController } from './firmware.controller';
import { FirmwareService } from './firmware.service';
import { FirmwareStatus, FirmwareType } from '@fleetforge/core';

describe('FirmwareController', () => {
  let controller: FirmwareController;
  let service: jest.Mocked<FirmwareService>;

  const mockFirmware = {
    id: 'fw-1',
    version: '1.0.0',
    name: 'Test Firmware',
    type: FirmwareType.FULL,
    status: FirmwareStatus.VALIDATING,
    deviceTypes: ['TRACKER'],
    fileUrl: '/firmware/fw-1.bin',
    checksum: 'abc123',
    size: 1024,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByVersion: jest.fn(),
      findCompatible: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      remove: jest.fn(),
      uploadFirmware: jest.fn(),
      validateFirmwareFile: jest.fn(),
      downloadFirmware: jest.fn(),
      revalidateFirmware: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FirmwareController],
      providers: [{ provide: FirmwareService, useValue: mockService }],
    }).compile();

    controller = module.get<FirmwareController>(FirmwareController);
    service = module.get(FirmwareService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create firmware', async () => {
      service.create.mockResolvedValue(mockFirmware as any);

      const result = await controller.create({
        version: '1.0.0',
        name: 'Test Firmware',
        type: FirmwareType.FULL,
        file: {
          url: '/firmware/fw-1.bin',
          size: 1024,
          checksum: 'abc123',
          checksumAlgorithm: 'SHA-256',
        },
        signature: {
          algorithm: 'RSA-SHA256',
          signature: 'base64signature',
          publicKey: 'base64key',
        },
        metadata: {
          deviceTypes: ['TRACKER'],
        },
        createdBy: 'user-1',
      });

      expect(result.id).toBe('fw-1');
      expect(service.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all firmware', async () => {
      service.findAll.mockResolvedValue([mockFirmware as any]);

      const result = await controller.findAll();

      expect(result).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      service.findAll.mockResolvedValue([mockFirmware as any]);

      await controller.findAll(FirmwareStatus.READY);

      expect(service.findAll).toHaveBeenCalledWith(
        { status: FirmwareStatus.READY, createdBy: undefined },
        undefined,
        undefined,
      );
    });
  });

  describe('findOne', () => {
    it('should return firmware by id', async () => {
      service.findOne.mockResolvedValue(mockFirmware as any);

      const result = await controller.findOne('fw-1');

      expect(result.id).toBe('fw-1');
    });
  });

  describe('findByVersion', () => {
    it('should return firmware by version', async () => {
      service.findByVersion.mockResolvedValue(mockFirmware as any);

      const result = await controller.findByVersion('1.0.0');

      expect(result.version).toBe('1.0.0');
    });
  });

  describe('findCompatible', () => {
    it('should return compatible firmware', async () => {
      service.findCompatible.mockResolvedValue([mockFirmware as any]);

      const result = await controller.findCompatible('TRACKER');

      expect(result).toHaveLength(1);
      expect(service.findCompatible).toHaveBeenCalledWith('TRACKER');
    });
  });

  describe('update', () => {
    it('should update firmware', async () => {
      service.update.mockResolvedValue({ ...mockFirmware, name: 'Updated' } as any);

      const result = await controller.update('fw-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });
  });

  describe('updateStatus', () => {
    it('should update firmware status', async () => {
      service.updateStatus.mockResolvedValue({
        ...mockFirmware,
        status: FirmwareStatus.READY,
      } as any);

      const result = await controller.updateStatus('fw-1', FirmwareStatus.READY);

      expect(result.status).toBe(FirmwareStatus.READY);
    });
  });

  describe('remove', () => {
    it('should remove firmware', async () => {
      service.remove.mockResolvedValue();

      await controller.remove('fw-1');

      expect(service.remove).toHaveBeenCalledWith('fw-1');
    });
  });

  describe('uploadFirmware', () => {
    it('should upload firmware file', async () => {
      const file = { buffer: Buffer.from('test'), originalname: 'fw.bin' } as Express.Multer.File;
      service.uploadFirmware.mockResolvedValue({ id: 'fw-2', version: '2.0.0' } as any);

      const result = await controller.uploadFirmware(file, {
        version: '2.0.0',
        name: 'New FW',
        type: FirmwareType.FULL,
        deviceTypes: ['TRACKER'],
      });

      expect(result.id).toBe('fw-2');
    });

    it('should throw when no file provided', async () => {
      await expect(controller.uploadFirmware(undefined as any, {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateFirmware', () => {
    it('should validate firmware file', async () => {
      const file = { buffer: Buffer.from('test'), originalname: 'fw.bin' } as Express.Multer.File;
      service.validateFirmwareFile.mockResolvedValue({
        isValid: true,
        checksum: 'abc123',
        errors: [],
        warnings: [],
      } as any);

      const result = await controller.validateFirmware(file, {});

      expect(result.isValid).toBe(true);
      expect(service.validateFirmwareFile).toHaveBeenCalledWith(file, {});
    });

    it('should throw when no file provided', async () => {
      await expect(controller.validateFirmware(undefined as any, {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('downloadFirmware', () => {
    it('should download firmware file', async () => {
      const buffer = Buffer.from('firmware content');
      service.downloadFirmware.mockResolvedValue({
        buffer,
        filename: 'fw.bin',
        contentType: 'application/octet-stream',
      });

      const mockRes = {
        set: jest.fn(),
      } as any;

      const result = await controller.downloadFirmware(['path', 'to', 'fw.bin'], mockRes);

      expect(result).toBeInstanceOf(StreamableFile);
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="fw.bin"',
        }),
      );
    });
  });

  describe('revalidateFirmware', () => {
    it('should revalidate existing firmware', async () => {
      service.revalidateFirmware.mockResolvedValue({
        isValid: true,
        checksum: 'abc123',
        errors: [],
        warnings: [],
      } as any);

      const result = await controller.revalidateFirmware('fw-1');

      expect(result.isValid).toBe(true);
      expect(service.revalidateFirmware).toHaveBeenCalledWith('fw-1');
    });
  });
});

/**
 * Multer Config Tests
 */
describe('Multer Config - fileFilter', () => {
  // Import the actual config to test the fileFilter
  const { firmwareMulterOptions } = require('./config/multer.config');

  const createMockFile = (originalname: string, mimetype: string): Express.Multer.File => ({
    originalname,
    mimetype,
    fieldname: 'file',
    encoding: '7bit',
    size: 1024,
    buffer: Buffer.from('test'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  });

  const mockRequest = {} as Express.Request;

  it('should accept valid .bin file with application/octet-stream', (done) => {
    const file = createMockFile('firmware.bin', 'application/octet-stream');

    firmwareMulterOptions.fileFilter(mockRequest, file, (error: Error | null, accept: boolean) => {
      expect(error).toBeNull();
      expect(accept).toBe(true);
      done();
    });
  });

  it('should accept valid .hex file with application/x-binary', (done) => {
    const file = createMockFile('firmware.hex', 'application/x-binary');

    firmwareMulterOptions.fileFilter(mockRequest, file, (error: Error | null, accept: boolean) => {
      expect(error).toBeNull();
      expect(accept).toBe(true);
      done();
    });
  });

  it('should accept valid .elf file with any application/* MIME type', (done) => {
    const file = createMockFile('firmware.elf', 'application/x-elf');

    firmwareMulterOptions.fileFilter(mockRequest, file, (error: Error | null, accept: boolean) => {
      expect(error).toBeNull();
      expect(accept).toBe(true);
      done();
    });
  });

  it('should accept .fw extension', (done) => {
    const file = createMockFile('device.fw', 'application/octet-stream');

    firmwareMulterOptions.fileFilter(mockRequest, file, (error: Error | null, accept: boolean) => {
      expect(error).toBeNull();
      expect(accept).toBe(true);
      done();
    });
  });

  it('should accept .img extension', (done) => {
    const file = createMockFile('system.img', 'application/octet-stream');

    firmwareMulterOptions.fileFilter(mockRequest, file, (error: Error | null, accept: boolean) => {
      expect(error).toBeNull();
      expect(accept).toBe(true);
      done();
    });
  });

  it('should reject invalid extension (.txt)', (done) => {
    const file = createMockFile('readme.txt', 'application/octet-stream');

    firmwareMulterOptions.fileFilter(mockRequest, file, (error: Error | null, accept: boolean) => {
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain('Invalid file extension');
      expect(accept).toBe(false);
      done();
    });
  });

  it('should reject invalid extension (.exe)', (done) => {
    const file = createMockFile('malware.exe', 'application/x-msdownload');

    firmwareMulterOptions.fileFilter(mockRequest, file, (error: Error | null, accept: boolean) => {
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain('Invalid file extension');
      expect(accept).toBe(false);
      done();
    });
  });

  it('should reject valid extension but invalid MIME type', (done) => {
    const file = createMockFile('firmware.bin', 'text/plain');

    firmwareMulterOptions.fileFilter(mockRequest, file, (error: Error | null, accept: boolean) => {
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain('Invalid file type');
      expect(accept).toBe(false);
      done();
    });
  });

  it('should handle file without extension', (done) => {
    const file = createMockFile('firmware', 'application/octet-stream');

    firmwareMulterOptions.fileFilter(mockRequest, file, (error: Error | null, accept: boolean) => {
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain('Invalid file extension');
      expect(accept).toBe(false);
      done();
    });
  });

  it('should handle uppercase extension (.BIN)', (done) => {
    const file = createMockFile('FIRMWARE.BIN', 'application/octet-stream');

    firmwareMulterOptions.fileFilter(mockRequest, file, (error: Error | null, accept: boolean) => {
      expect(error).toBeNull();
      expect(accept).toBe(true);
      done();
    });
  });

  it('should reject image/jpeg MIME type', (done) => {
    const file = createMockFile('photo.bin', 'image/jpeg');

    firmwareMulterOptions.fileFilter(mockRequest, file, (error: Error | null, accept: boolean) => {
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain('Invalid file type: image/jpeg');
      expect(accept).toBe(false);
      done();
    });
  });
});
