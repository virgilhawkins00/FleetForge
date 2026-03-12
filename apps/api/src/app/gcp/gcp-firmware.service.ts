import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { StorageService, FirmwareArtifact } from '@fleetforge/gcp-integration';

/**
 * Service to manage firmware in GCP Cloud Storage
 */
@Injectable()
export class GCPFirmwareService {
  private readonly logger = new Logger(GCPFirmwareService.name);

  constructor(
    @Inject('GCP_ENABLED') private readonly enabled: boolean,
    @Optional() private readonly storage: StorageService | null,
  ) {}

  /**
   * Upload firmware to GCP Storage
   */
  async uploadFirmware(
    deviceType: string,
    version: string,
    fileBuffer: Buffer,
    metadata?: Record<string, string>,
  ): Promise<FirmwareArtifact | null> {
    if (!this.enabled || !this.storage) {
      this.logger.warn('GCP Storage not enabled, skipping firmware upload');
      return null;
    }

    try {
      const artifact = await this.storage.uploadFirmware(deviceType, version, fileBuffer, metadata);
      this.logger.log(`Firmware uploaded to GCP: ${deviceType}/${version}`);
      return artifact;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to upload firmware: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Get signed download URL for firmware (OTA)
   */
  async getDownloadUrl(
    deviceType: string,
    version: string,
    expiresInMinutes = 60,
  ): Promise<string | null> {
    if (!this.enabled || !this.storage) {
      return null;
    }

    try {
      return await this.storage.getFirmwareUrl(deviceType, version, expiresInMinutes);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to get firmware URL: ${err.message}`);
      return null;
    }
  }

  /**
   * List available firmware versions
   */
  async listVersions(deviceType: string): Promise<FirmwareArtifact[]> {
    if (!this.enabled || !this.storage) {
      return [];
    }

    try {
      return await this.storage.listFirmwareVersions(deviceType);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to list firmware: ${err.message}`);
      return [];
    }
  }

  /**
   * Delete firmware version
   */
  async deleteFirmware(deviceType: string, version: string): Promise<boolean> {
    if (!this.enabled || !this.storage) {
      return false;
    }

    try {
      await this.storage.deleteFirmware(deviceType, version);
      this.logger.log(`Firmware deleted from GCP: ${deviceType}/${version}`);
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to delete firmware: ${err.message}`);
      return false;
    }
  }
}
