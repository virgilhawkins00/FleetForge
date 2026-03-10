/**
 * Firmware Entity - Represents a firmware package
 */

import { FirmwareStatus, FirmwareType } from '../enums';
import { IFirmwareSignature } from '../value-objects';

export interface IFirmwareMetadata {
  deviceTypes: string[];
  minHardwareVersion?: string;
  maxHardwareVersion?: string;
  requiredCapabilities?: string[];
  releaseNotes?: string;
  changelog?: string;
}

export interface IFirmwareFile {
  url: string;
  size: number;
  checksum: string;
  checksumAlgorithm: string;
}

export class Firmware {
  constructor(
    public readonly id: string,
    public readonly version: string,
    public name: string,
    public type: FirmwareType,
    public status: FirmwareStatus,
    public file: IFirmwareFile,
    public signature: IFirmwareSignature,
    public metadata: IFirmwareMetadata,
    public readonly createdBy: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public publishedAt?: Date,
  ) {}

  /**
   * Update firmware status
   */
  updateStatus(newStatus: FirmwareStatus): void {
    const validTransitions: Record<FirmwareStatus, FirmwareStatus[]> = {
      [FirmwareStatus.UPLOADING]: [FirmwareStatus.VALIDATING, FirmwareStatus.FAILED],
      [FirmwareStatus.VALIDATING]: [FirmwareStatus.READY, FirmwareStatus.FAILED],
      [FirmwareStatus.READY]: [FirmwareStatus.DEPLOYING, FirmwareStatus.DEPRECATED],
      [FirmwareStatus.DEPLOYING]: [
        FirmwareStatus.DEPLOYED,
        FirmwareStatus.FAILED,
        FirmwareStatus.ROLLED_BACK,
      ],
      [FirmwareStatus.DEPLOYED]: [FirmwareStatus.DEPRECATED, FirmwareStatus.ROLLED_BACK],
      [FirmwareStatus.FAILED]: [FirmwareStatus.UPLOADING],
      [FirmwareStatus.ROLLED_BACK]: [FirmwareStatus.DEPRECATED],
      [FirmwareStatus.DEPRECATED]: [],
    };

    const allowedTransitions = validTransitions[this.status] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${this.status} to ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`,
      );
    }

    this.status = newStatus;
    this.updatedAt = new Date();

    if (newStatus === FirmwareStatus.DEPLOYED && !this.publishedAt) {
      this.publishedAt = new Date();
    }
  }

  /**
   * Check if firmware is compatible with device
   */
  isCompatibleWith(deviceType: string, hardwareVersion?: string): boolean {
    if (!this.metadata.deviceTypes.includes(deviceType)) {
      return false;
    }

    if (hardwareVersion) {
      if (
        this.metadata.minHardwareVersion &&
        hardwareVersion < this.metadata.minHardwareVersion
      ) {
        return false;
      }

      if (
        this.metadata.maxHardwareVersion &&
        hardwareVersion > this.metadata.maxHardwareVersion
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if firmware is ready for deployment
   */
  isReadyForDeployment(): boolean {
    return this.status === FirmwareStatus.READY && !this.signature.isExpired();
  }

  /**
   * Validate firmware checksum
   */
  validateChecksum(actualChecksum: string): boolean {
    return this.file.checksum === actualChecksum;
  }

  /**
   * Get firmware age in days
   */
  getAgeInDays(): number {
    const now = new Date();
    const diff = now.getTime() - this.createdAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      version: this.version,
      name: this.name,
      type: this.type,
      status: this.status,
      file: this.file,
      signature: this.signature.toJSON(),
      metadata: this.metadata,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      publishedAt: this.publishedAt,
    };
  }
}

