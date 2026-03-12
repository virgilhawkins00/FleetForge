import { Storage, Bucket } from '@google-cloud/storage';
import { createHash } from 'crypto';
import { StorageConfig, FirmwareArtifact } from '../types';

/**
 * Google Cloud Storage Service for firmware and asset management
 */
export class StorageService {
  private client: Storage;
  private config: StorageConfig;
  private buckets: Map<string, Bucket> = new Map();

  constructor(config: StorageConfig) {
    this.config = {
      firmwareBucket: 'fleetforge-firmware',
      logsBucket: 'fleetforge-logs',
      backupBucket: 'fleetforge-backups',
      ...config,
    };

    this.client = new Storage({
      projectId: config.projectId,
      keyFilename: config.credentials,
    });
  }

  /**
   * Initialize storage buckets
   */
  async initialize(): Promise<void> {
    const bucketNames = [
      this.config.firmwareBucket!,
      this.config.logsBucket!,
      this.config.backupBucket!,
    ];

    for (const bucketName of bucketNames) {
      await this.ensureBucket(bucketName);
    }
  }

  private async ensureBucket(bucketName: string): Promise<Bucket> {
    if (this.buckets.has(bucketName)) {
      return this.buckets.get(bucketName)!;
    }

    const bucket = this.client.bucket(bucketName);
    const [exists] = await bucket.exists();

    if (!exists) {
      await bucket.create({
        location: this.config.region || 'US',
        storageClass: 'STANDARD',
      });
    }

    this.buckets.set(bucketName, bucket);
    return bucket;
  }

  /**
   * Upload firmware artifact
   */
  async uploadFirmware(
    deviceType: string,
    version: string,
    fileBuffer: Buffer,
    metadata?: Record<string, string>,
  ): Promise<FirmwareArtifact> {
    const bucket = await this.ensureBucket(this.config.firmwareBucket!);
    const fileName = `${deviceType}/${version}/firmware.bin`;
    const checksum = createHash('sha256').update(fileBuffer).digest('hex');

    const file = bucket.file(fileName);
    await file.save(fileBuffer, {
      metadata: {
        contentType: 'application/octet-stream',
        metadata: {
          version,
          deviceType,
          checksum,
          ...metadata,
        },
      },
    });

    return {
      version,
      deviceType,
      fileName,
      checksum,
      size: fileBuffer.length,
      uploadedAt: new Date(),
      metadata,
    };
  }

  /**
   * Get firmware download URL (signed)
   */
  async getFirmwareUrl(
    deviceType: string,
    version: string,
    expiresInMinutes = 60,
  ): Promise<string> {
    const bucket = await this.ensureBucket(this.config.firmwareBucket!);
    const fileName = `${deviceType}/${version}/firmware.bin`;
    const file = bucket.file(fileName);

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  }

  /**
   * List available firmware versions
   */
  async listFirmwareVersions(deviceType: string): Promise<FirmwareArtifact[]> {
    const bucket = await this.ensureBucket(this.config.firmwareBucket!);
    const [files] = await bucket.getFiles({ prefix: `${deviceType}/` });

    const artifacts: FirmwareArtifact[] = [];

    for (const file of files) {
      if (file.name.endsWith('firmware.bin')) {
        const [metadata] = await file.getMetadata();
        const parts = file.name.split('/');

        const customMetadata = metadata.metadata as Record<string, string> | undefined;
        artifacts.push({
          version: parts[1],
          deviceType,
          fileName: file.name,
          checksum: customMetadata?.['checksum'] || '',
          size: parseInt(metadata.size as string, 10),
          uploadedAt: new Date(metadata.timeCreated as string),
          metadata: customMetadata,
        });
      }
    }

    return artifacts.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  /**
   * Delete firmware version
   */
  async deleteFirmware(deviceType: string, version: string): Promise<void> {
    const bucket = await this.ensureBucket(this.config.firmwareBucket!);
    await bucket.deleteFiles({ prefix: `${deviceType}/${version}/` });
  }
}
