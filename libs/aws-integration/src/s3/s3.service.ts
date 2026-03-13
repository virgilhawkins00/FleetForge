/**
 * AWS S3 Service for FleetForge
 * Handles firmware storage, logs, and backups
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  BucketLocationConstraint,
  CreateBucketCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
import { S3Config, FirmwareUploadResult, PresignedUrlOptions } from '../types';

export interface FirmwareArtifact {
  version: string;
  deviceType: string;
  key: string;
  checksum: string;
  size: number;
  uploadedAt: Date;
  metadata?: Record<string, string>;
}

export class S3Service {
  private client: S3Client;
  private config: S3Config;
  private initialized = false;

  constructor(config: S3Config) {
    this.config = config;
    this.client = new S3Client({
      region: config.region,
      credentials: config.credentials,
      endpoint: config.endpoint,
      forcePathStyle: !!config.endpoint, // For LocalStack
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.ensureBucket(this.config.firmwareBucket);
    if (this.config.logsBucket) {
      await this.ensureBucket(this.config.logsBucket);
    }
    if (this.config.backupBucket) {
      await this.ensureBucket(this.config.backupBucket);
    }
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private async ensureBucket(bucketName: string): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotFound' || err.name === 'NoSuchBucket') {
        // For us-east-1, LocationConstraint must not be specified
        const createBucketParams: CreateBucketCommandInput = {
          Bucket: bucketName,
        };
        if (this.config.region && this.config.region !== 'us-east-1') {
          createBucketParams.CreateBucketConfiguration = {
            LocationConstraint: this.config.region as BucketLocationConstraint,
          };
        }
        await this.client.send(new CreateBucketCommand(createBucketParams));
      } else {
        throw error;
      }
    }
  }

  // Firmware Operations
  async uploadFirmware(
    deviceType: string,
    version: string,
    fileBuffer: Buffer,
    metadata?: Record<string, string>,
  ): Promise<FirmwareUploadResult> {
    const key = `${deviceType}/${version}/firmware.bin`;
    const checksum = createHash('sha256').update(fileBuffer).digest('hex');

    const response = await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.firmwareBucket,
        Key: key,
        Body: fileBuffer,
        ContentType: 'application/octet-stream',
        Metadata: {
          version,
          deviceType,
          checksum,
          ...metadata,
        },
      }),
    );

    return {
      bucket: this.config.firmwareBucket,
      key,
      etag: response.ETag || '',
      versionId: response.VersionId,
      location: `s3://${this.config.firmwareBucket}/${key}`,
    };
  }

  async getFirmwareUrl(
    deviceType: string,
    version: string,
    options: PresignedUrlOptions = {},
  ): Promise<string> {
    const key = `${deviceType}/${version}/firmware.bin`;
    const command = new GetObjectCommand({
      Bucket: this.config.firmwareBucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: options.expiresIn || 3600,
    });
  }

  async getUploadUrl(
    deviceType: string,
    version: string,
    options: PresignedUrlOptions = {},
  ): Promise<string> {
    const key = `${deviceType}/${version}/firmware.bin`;
    const command = new PutObjectCommand({
      Bucket: this.config.firmwareBucket,
      Key: key,
      ContentType: options.contentType || 'application/octet-stream',
    });

    return getSignedUrl(this.client, command, {
      expiresIn: options.expiresIn || 3600,
    });
  }

  async listFirmwareVersions(deviceType: string): Promise<FirmwareArtifact[]> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.config.firmwareBucket,
        Prefix: `${deviceType}/`,
      }),
    );

    const artifacts: FirmwareArtifact[] = [];

    for (const obj of response.Contents || []) {
      if (obj.Key?.endsWith('firmware.bin')) {
        const headResponse = await this.client.send(
          new HeadObjectCommand({
            Bucket: this.config.firmwareBucket,
            Key: obj.Key,
          }),
        );

        const parts = obj.Key.split('/');
        artifacts.push({
          version: parts[1],
          deviceType,
          key: obj.Key,
          checksum: headResponse.Metadata?.['checksum'] || '',
          size: obj.Size || 0,
          uploadedAt: obj.LastModified || new Date(),
          metadata: headResponse.Metadata,
        });
      }
    }

    return artifacts.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async deleteFirmware(deviceType: string, version: string): Promise<void> {
    const key = `${deviceType}/${version}/firmware.bin`;
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.firmwareBucket,
        Key: key,
      }),
    );
  }

  async getFirmwareMetadata(deviceType: string, version: string): Promise<FirmwareArtifact | null> {
    const key = `${deviceType}/${version}/firmware.bin`;
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.firmwareBucket,
          Key: key,
        }),
      );

      return {
        version,
        deviceType,
        key,
        checksum: response.Metadata?.['checksum'] || '',
        size: response.ContentLength || 0,
        uploadedAt: response.LastModified || new Date(),
        metadata: response.Metadata,
      };
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  // Log Operations
  async uploadLog(
    deviceId: string,
    logType: string,
    content: Buffer | string,
  ): Promise<{ bucket: string; key: string }> {
    if (!this.config.logsBucket) {
      throw new Error('Logs bucket not configured');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `${deviceId}/${logType}/${timestamp}.log`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.logsBucket,
        Key: key,
        Body: typeof content === 'string' ? Buffer.from(content) : content,
        ContentType: 'text/plain',
      }),
    );

    return { bucket: this.config.logsBucket, key };
  }

  async getLogUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.config.logsBucket) {
      throw new Error('Logs bucket not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.config.logsBucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }
}
