/**
 * Local Filesystem Storage Service Implementation
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IStorageService,
  IStorageFile,
  IStoredFile,
  IStorageUploadOptions,
} from '@fleetforge/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storagePath: string;
  private readonly cdnUrl: string;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.storagePath = this.configService.get<string>(
      'FIRMWARE_STORAGE_PATH',
      './storage/firmware',
    );
    this.cdnUrl = this.configService.get<string>(
      'OTA_CDN_URL',
      'http://localhost:3100/api/v1/firmware/download',
    );
    this.bucket = this.configService.get<string>('OTA_STORAGE_BUCKET', 'firmware');
  }

  async upload(file: IStorageFile, options?: IStorageUploadOptions): Promise<IStoredFile> {
    await this.ensureStorageDir();

    const fileKey = options?.key || this.generateFileKey(file.originalName);
    const filePath = path.join(this.storagePath, fileKey);
    const dirPath = path.dirname(filePath);

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Calculate checksum before writing
    const checksum = this.calculateChecksum(file.buffer);

    // Write file
    await fs.writeFile(filePath, file.buffer);

    this.logger.log(`File uploaded: ${fileKey} (${file.size} bytes, checksum: ${checksum})`);

    return {
      key: fileKey,
      url: `${this.cdnUrl}/${fileKey}`,
      size: file.size,
      checksum,
      checksumAlgorithm: 'SHA-256',
      bucket: this.bucket,
      contentType: options?.contentType || file.mimeType,
      uploadedAt: new Date(),
    };
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.storagePath, key);
    return fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.storagePath, key);
    await fs.unlink(filePath);
    this.logger.log(`File deleted: ${key}`);
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.storagePath, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<IStoredFile | null> {
    const filePath = path.join(this.storagePath, key);
    try {
      const stats = await fs.stat(filePath);
      const buffer = await fs.readFile(filePath);
      const checksum = this.calculateChecksum(buffer);

      return {
        key,
        url: `${this.cdnUrl}/${key}`,
        size: stats.size,
        checksum,
        checksumAlgorithm: 'SHA-256',
        bucket: this.bucket,
        contentType: 'application/octet-stream',
        uploadedAt: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    // For local storage, generate a simple token-based URL
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + expiresInSeconds * 1000;
    return `${this.cdnUrl}/${key}?token=${token}&expires=${expiry}`;
  }

  calculateChecksum(buffer: Buffer, algorithm = 'sha256'): string {
    return crypto.createHash(algorithm).update(buffer).digest('hex');
  }

  private async ensureStorageDir(): Promise<void> {
    await fs.mkdir(this.storagePath, { recursive: true });
  }

  private generateFileKey(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = new Date().toISOString().split('T')[0];
    return `${timestamp}/${uuidv4()}${ext}`;
  }
}

