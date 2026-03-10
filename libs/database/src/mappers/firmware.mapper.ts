/**
 * Firmware Mapper - Converts between Domain Entity and MongoDB Document
 */

import { Firmware, IFirmwareMetadata, IFirmwareFile, FirmwareSignature } from '@fleetforge/core';
import { FirmwareDocument, FirmwareModel } from '../schemas';

export class FirmwareMapper {
  /**
   * Convert MongoDB Document to Domain Entity
   */
  static toDomain(doc: FirmwareDocument): Firmware {
    const metadata: IFirmwareMetadata = {
      deviceTypes: doc.metadata.deviceTypes,
      minHardwareVersion: doc.metadata.minHardwareVersion,
      maxHardwareVersion: doc.metadata.maxHardwareVersion,
      requiredCapabilities: doc.metadata.requiredCapabilities,
      releaseNotes: doc.metadata.releaseNotes,
      changelog: doc.metadata.changelog,
    };

    const file: IFirmwareFile = {
      url: doc.file.url,
      size: doc.file.size,
      checksum: doc.file.checksum,
      checksumAlgorithm: doc.file.checksumAlgorithm,
    };

    const signature = new FirmwareSignature(
      doc.signature.algorithm,
      doc.signature.signature,
      doc.signature.publicKey,
      doc.signature.timestamp,
    );

    return new Firmware(
      doc._id,
      doc.version,
      doc.name,
      doc.type,
      doc.status,
      file,
      signature,
      metadata,
      doc.createdBy,
      doc.createdAt,
      doc.updatedAt,
      doc.publishedAt,
    );
  }

  /**
   * Convert Domain Entity to MongoDB Document format
   */
  static toPersistence(entity: Firmware): Partial<FirmwareModel> {
    return {
      _id: entity.id,
      version: entity.version,
      name: entity.name,
      type: entity.type,
      status: entity.status,
      file: {
        url: entity.file.url,
        size: entity.file.size,
        checksum: entity.file.checksum,
        checksumAlgorithm: entity.file.checksumAlgorithm,
      },
      signature: {
        algorithm: entity.signature.algorithm,
        signature: entity.signature.signature,
        publicKey: entity.signature.publicKey,
        timestamp: entity.signature.timestamp,
      },
      metadata: {
        deviceTypes: entity.metadata.deviceTypes,
        minHardwareVersion: entity.metadata.minHardwareVersion,
        maxHardwareVersion: entity.metadata.maxHardwareVersion,
        requiredCapabilities: entity.metadata.requiredCapabilities,
        releaseNotes: entity.metadata.releaseNotes,
        changelog: entity.metadata.changelog,
      },
      createdBy: entity.createdBy,
      publishedAt: entity.publishedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
