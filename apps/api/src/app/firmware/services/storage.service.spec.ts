/**
 * StorageService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('StorageService', () => {
  let service: StorageService;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn().mockImplementation((_key: string, defaultValue: unknown) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateChecksum', () => {
    it('should calculate checksum correctly', () => {
      const buffer = Buffer.from('test content');
      const checksum = service.calculateChecksum(buffer);

      expect(checksum).toHaveLength(64);
      expect(typeof checksum).toBe('string');
    });
  });

  describe('upload', () => {
    it('should upload file successfully', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();

      const file = {
        buffer: Buffer.from('firmware content'),
        originalName: 'test.bin',
        size: 16,
        mimeType: 'application/octet-stream',
      };

      const result = await service.upload(file);

      expect(result.key).toBeDefined();
      expect(result.size).toBe(16);
      expect(result.checksum).toHaveLength(64);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should use custom key when provided', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();

      const file = {
        buffer: Buffer.from('firmware content'),
        originalName: 'test.bin',
        size: 16,
        mimeType: 'application/octet-stream',
      };

      const result = await service.upload(file, { key: 'custom/path/file.bin' });

      expect(result.key).toBe('custom/path/file.bin');
    });
  });

  describe('download', () => {
    it('should download file successfully', async () => {
      const content = Buffer.from('file content');
      mockFs.readFile.mockResolvedValue(content);

      const result = await service.download('test-key');

      expect(result).toEqual(content);
    });
  });

  describe('delete', () => {
    it('should delete file successfully', async () => {
      mockFs.unlink.mockResolvedValue();

      await service.delete('test-key');

      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true when file exists', async () => {
      mockFs.access.mockResolvedValue();

      const result = await service.exists('existing-file');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await service.exists('non-existing-file');

      expect(result).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata when file exists', async () => {
      const content = Buffer.from('file content');
      mockFs.stat.mockResolvedValue({ size: 12, mtime: new Date() } as any);
      mockFs.readFile.mockResolvedValue(content);

      const result = await service.getMetadata('test-key');

      expect(result).not.toBeNull();
      expect(result?.size).toBe(12);
      expect(result?.checksum).toHaveLength(64);
    });

    it('should return null when file does not exist', async () => {
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      const result = await service.getMetadata('non-existing');

      expect(result).toBeNull();
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL', async () => {
      const url = await service.getSignedUrl('test-key', 3600);

      expect(url).toContain('test-key');
      expect(url).toContain('token=');
      expect(url).toContain('expires=');
    });
  });
});
