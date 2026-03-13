/**
 * Azure Blob Storage Service for FleetForge
 *
 * Provides firmware storage, logs management, and SAS URL generation
 */

import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';
import { BlobStorageConfig, BlobUploadResult, BlobDownloadResult } from '../types';

export class BlobStorageService {
  private blobServiceClient: BlobServiceClient;
  private firmwareContainer: ContainerClient;
  private logsContainer: ContainerClient;
  private backupContainer: ContainerClient;
  private credential: StorageSharedKeyCredential | null = null;
  private initialized = false;

  constructor(config: BlobStorageConfig) {
    if (config.connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
    } else if (config.storageAccountKey) {
      this.credential = new StorageSharedKeyCredential(
        config.storageAccountName,
        config.storageAccountKey,
      );
      this.blobServiceClient = new BlobServiceClient(
        `https://${config.storageAccountName}.blob.core.windows.net`,
        this.credential,
      );
    } else {
      throw new Error('Either connectionString or storageAccountKey is required');
    }

    this.firmwareContainer = this.blobServiceClient.getContainerClient(
      config.firmwareContainer || 'firmware',
    );
    this.logsContainer = this.blobServiceClient.getContainerClient(config.logsContainer || 'logs');
    this.backupContainer = this.blobServiceClient.getContainerClient(
      config.backupContainer || 'backups',
    );
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Promise.all([
      this.firmwareContainer.createIfNotExists(),
      this.logsContainer.createIfNotExists(),
      this.backupContainer.createIfNotExists(),
    ]);

    this.initialized = true;
  }

  // ==================== Firmware Operations ====================

  /**
   * Upload firmware file
   */
  async uploadFirmware(
    deviceType: string,
    version: string,
    data: Buffer,
    contentType = 'application/octet-stream',
  ): Promise<BlobUploadResult> {
    const blobName = `${deviceType}/${version}/firmware.bin`;
    return this.uploadBlob(this.firmwareContainer, blobName, data, contentType);
  }

  /**
   * Download firmware file
   */
  async downloadFirmware(deviceType: string, version: string): Promise<BlobDownloadResult> {
    const blobName = `${deviceType}/${version}/firmware.bin`;
    return this.downloadBlob(this.firmwareContainer, blobName);
  }

  /**
   * Generate a SAS URL for firmware download
   */
  async getFirmwareUrl(
    deviceType: string,
    version: string,
    expiresInMinutes = 60,
  ): Promise<string> {
    const blobName = `${deviceType}/${version}/firmware.bin`;
    return this.generateSasUrl(this.firmwareContainer, blobName, expiresInMinutes, 'r');
  }

  /**
   * List available firmware versions for a device type
   */
  async listFirmwareVersions(deviceType: string): Promise<string[]> {
    const versions: string[] = [];
    const prefix = `${deviceType}/`;

    for await (const item of this.firmwareContainer.listBlobsByHierarchy('/', { prefix })) {
      if (item.kind === 'prefix' && item.name) {
        const version = item.name.replace(prefix, '').replace('/', '');
        if (version) versions.push(version);
      }
    }

    return versions;
  }

  // ==================== Logs Operations ====================

  /**
   * Upload device logs
   */
  async uploadLogs(
    deviceId: string,
    timestamp: Date,
    data: Buffer,
    contentType = 'application/gzip',
  ): Promise<BlobUploadResult> {
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toISOString().replace(/[:.]/g, '-');
    const blobName = `${deviceId}/${dateStr}/${timeStr}.log.gz`;
    return this.uploadBlob(this.logsContainer, blobName, data, contentType);
  }

  /**
   * Get logs upload URL for device
   */
  async getLogsUploadUrl(deviceId: string, expiresInMinutes = 30): Promise<string> {
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toISOString().replace(/[:.]/g, '-');
    const blobName = `${deviceId}/${dateStr}/${timeStr}.log.gz`;
    return this.generateSasUrl(this.logsContainer, blobName, expiresInMinutes, 'cw');
  }

  /**
   * List logs for a device on a specific date
   */
  async listDeviceLogs(deviceId: string, date: Date): Promise<string[]> {
    const logs: string[] = [];
    const dateStr = date.toISOString().split('T')[0];
    const prefix = `${deviceId}/${dateStr}/`;

    for await (const blob of this.logsContainer.listBlobsFlat({ prefix })) {
      logs.push(blob.name);
    }

    return logs;
  }

  // ==================== Backup Operations ====================

  /**
   * Create a backup
   */
  async createBackup(fleetId: string, backupType: string, data: Buffer): Promise<BlobUploadResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const blobName = `${fleetId}/${backupType}/${timestamp}.backup`;
    return this.uploadBlob(this.backupContainer, blobName, data, 'application/octet-stream');
  }

  // ==================== Helper Methods ====================

  private async uploadBlob(
    container: ContainerClient,
    blobName: string,
    data: Buffer,
    contentType: string,
  ): Promise<BlobUploadResult> {
    const blockBlobClient = container.getBlockBlobClient(blobName);
    const result = await blockBlobClient.upload(data, data.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    return {
      url: blockBlobClient.url,
      etag: result.etag,
      lastModified: result.lastModified,
      contentMD5: result.contentMD5 ? Buffer.from(result.contentMD5).toString('base64') : undefined,
    };
  }

  private async downloadBlob(
    container: ContainerClient,
    blobName: string,
  ): Promise<BlobDownloadResult> {
    const blockBlobClient = container.getBlockBlobClient(blobName);
    const response = await blockBlobClient.download(0);

    const chunks: Buffer[] = [];
    for await (const chunk of response.readableStreamBody as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }

    return {
      data: Buffer.concat(chunks),
      contentType: response.contentType,
      contentLength: response.contentLength,
      etag: response.etag,
      lastModified: response.lastModified,
    };
  }

  private generateSasUrl(
    container: ContainerClient,
    blobName: string,
    expiresInMinutes: number,
    permissions: string,
  ): string {
    if (!this.credential) {
      throw new Error('SAS generation requires StorageSharedKeyCredential');
    }

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: container.containerName,
        blobName,
        permissions: BlobSASPermissions.parse(permissions),
        startsOn,
        expiresOn,
      },
      this.credential,
    ).toString();

    return `${container.getBlockBlobClient(blobName).url}?${sasToken}`;
  }

  /**
   * Delete a blob
   */
  async deleteBlob(containerName: string, blobName: string): Promise<void> {
    const container = this.blobServiceClient.getContainerClient(containerName);
    await container.getBlockBlobClient(blobName).delete();
  }
}
