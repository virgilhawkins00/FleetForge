/// <reference types="multer" />

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Firmware, FirmwareStatus, FirmwareSignature } from '@fleetforge/core';
import { FirmwareRepository } from '@fleetforge/database';
import { CreateFirmwareDto } from './dto/create-firmware.dto';
import { UpdateFirmwareDto } from './dto/update-firmware.dto';
import { FirmwareResponseDto } from './dto/firmware-response.dto';
import {
  UploadFirmwareDto,
  FirmwareUploadResponseDto,
  ValidateFirmwareDto,
  FirmwareValidationResponseDto,
} from './dto/upload-firmware.dto';
import { StorageService } from './services/storage.service';
import { FirmwareValidationService } from './services/firmware-validation.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FirmwareService {
  private readonly logger = new Logger(FirmwareService.name);

  constructor(
    private readonly firmwareRepository: FirmwareRepository,
    private readonly storageService: StorageService,
    private readonly validationService: FirmwareValidationService,
  ) {}

  async create(createFirmwareDto: CreateFirmwareDto): Promise<FirmwareResponseDto> {
    const signature = new FirmwareSignature(
      createFirmwareDto.signature.algorithm,
      createFirmwareDto.signature.signature,
      createFirmwareDto.signature.publicKey,
    );

    const firmware = new Firmware(
      uuidv4(),
      createFirmwareDto.version,
      createFirmwareDto.name,
      createFirmwareDto.type,
      FirmwareStatus.UPLOADING,
      createFirmwareDto.file,
      signature,
      createFirmwareDto.metadata,
      createFirmwareDto.createdBy,
    );

    const saved = await this.firmwareRepository.create(firmware);
    return this.toResponseDto(saved);
  }

  async findAll(
    filter: { status?: FirmwareStatus; createdBy?: string },
    limit = 100,
    offset = 0,
  ): Promise<FirmwareResponseDto[]> {
    const firmwares = await this.firmwareRepository.findMany(filter, limit, offset);
    return firmwares.map((fw) => this.toResponseDto(fw));
  }

  async findOne(id: string): Promise<FirmwareResponseDto> {
    const firmware = await this.firmwareRepository.findById(id);
    if (!firmware) {
      throw new NotFoundException(`Firmware with ID ${id} not found`);
    }
    return this.toResponseDto(firmware);
  }

  async findByVersion(version: string): Promise<FirmwareResponseDto> {
    const firmware = await this.firmwareRepository.findByVersion(version);
    if (!firmware) {
      throw new NotFoundException(`Firmware version ${version} not found`);
    }
    return this.toResponseDto(firmware);
  }

  async findCompatible(deviceType: string): Promise<FirmwareResponseDto[]> {
    const firmwares = await this.firmwareRepository.findMany({ deviceTypes: [deviceType] });
    return firmwares.map((fw) => this.toResponseDto(fw));
  }

  async update(id: string, updateFirmwareDto: UpdateFirmwareDto): Promise<FirmwareResponseDto> {
    const existing = await this.firmwareRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Firmware with ID ${id} not found`);
    }

    const updates: Partial<Firmware> = {};
    if (updateFirmwareDto.name) updates.name = updateFirmwareDto.name;
    if (updateFirmwareDto.metadata) {
      updates.metadata = { ...existing.metadata, ...updateFirmwareDto.metadata };
    }

    const updated = await this.firmwareRepository.update(id, updates);
    return this.toResponseDto(updated);
  }

  async updateStatus(id: string, newStatus: FirmwareStatus): Promise<FirmwareResponseDto> {
    const firmware = await this.firmwareRepository.findById(id);
    if (!firmware) {
      throw new NotFoundException(`Firmware with ID ${id} not found`);
    }

    try {
      firmware.updateStatus(newStatus);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const updated = await this.firmwareRepository.update(id, {
      status: firmware.status,
      publishedAt: firmware.publishedAt,
    });
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const firmware = await this.firmwareRepository.findById(id);
    if (!firmware) {
      throw new NotFoundException(`Firmware with ID ${id} not found`);
    }
    await this.firmwareRepository.delete(id);
  }

  async count(filter: { status?: FirmwareStatus }): Promise<number> {
    return this.firmwareRepository.count(filter);
  }

  // ==========================================
  // File Upload & Validation Methods
  // ==========================================

  async uploadFirmware(
    file: Express.Multer.File,
    uploadDto: UploadFirmwareDto,
  ): Promise<FirmwareUploadResponseDto> {
    this.logger.log(`Uploading firmware: ${uploadDto.version} (${file.originalname})`);

    // 1. Validate the file
    const validation = await this.validationService.validateFirmware(
      file.buffer,
      file.originalname,
      { maxFileSize: 100 * 1024 * 1024 },
    );

    if (!validation.isValid && !uploadDto.skipValidation) {
      throw new BadRequestException({
        message: 'Firmware validation failed',
        errors: validation.errors,
      });
    }

    // 2. Upload to storage
    const storedFile = await this.storageService.upload(
      {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      { key: `firmware/${uploadDto.version}/${file.originalname}` },
    );

    // 3. Parse deviceTypes from comma-separated string (form-data)
    const deviceTypes = this.parseDeviceTypes(uploadDto.deviceTypes);

    // 4. Create placeholder signature (to be signed later)
    const signature = new FirmwareSignature(
      'RSA-SHA256',
      'pending-signature',
      'pending-public-key',
    );

    // 5. Create firmware entity
    const firmware = new Firmware(
      uuidv4(),
      uploadDto.version,
      uploadDto.name,
      uploadDto.type,
      FirmwareStatus.VALIDATING,
      {
        url: storedFile.url,
        size: storedFile.size,
        checksum: storedFile.checksum,
        checksumAlgorithm: storedFile.checksumAlgorithm,
      },
      signature,
      {
        deviceTypes,
        minHardwareVersion: uploadDto.minHardwareVersion,
        maxHardwareVersion: uploadDto.maxHardwareVersion,
        requiredCapabilities: uploadDto.requiredCapabilities,
        releaseNotes: uploadDto.releaseNotes,
        changelog: uploadDto.changelog,
      },
      'system', // TODO: Get from auth context
    );

    // 6. Save to database
    const saved = await this.firmwareRepository.create(firmware);

    // 7. Update status to READY if validation passed
    if (validation.isValid) {
      saved.updateStatus(FirmwareStatus.READY);
      await this.firmwareRepository.update(saved.id, { status: saved.status });
    }

    this.logger.log(`Firmware uploaded successfully: ${saved.id}`);

    return {
      id: saved.id,
      version: saved.version,
      name: saved.name,
      type: saved.type,
      status: saved.status,
      file: {
        url: storedFile.url,
        size: storedFile.size,
        checksum: storedFile.checksum,
        checksumAlgorithm: storedFile.checksumAlgorithm,
      },
      validation,
      createdAt: saved.createdAt,
    };
  }

  async validateFirmwareFile(
    file: Express.Multer.File,
    validateDto: ValidateFirmwareDto,
  ): Promise<FirmwareValidationResponseDto> {
    const validation = await this.validationService.validateFirmware(
      file.buffer,
      file.originalname,
      {
        expectedChecksum: validateDto.expectedChecksum,
        signature: validateDto.signature,
        publicKey: validateDto.publicKey,
        signatureAlgorithm: validateDto.signatureAlgorithm,
      },
    );

    const checksum = this.validationService.calculateChecksum(file.buffer);

    return {
      isValid: validation.isValid,
      checksumValid: validation.checksumValid,
      signatureValid: validation.signatureValid,
      calculatedChecksum: checksum,
      fileSize: file.size,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  async downloadFirmware(
    key: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const exists = await this.storageService.exists(key);
    if (!exists) {
      throw new NotFoundException(`Firmware file not found: ${key}`);
    }

    const buffer = await this.storageService.download(key);
    const filename = key.split('/').pop() || 'firmware.bin';

    return {
      buffer,
      filename,
      contentType: 'application/octet-stream',
    };
  }

  async revalidateFirmware(id: string): Promise<FirmwareValidationResponseDto> {
    const firmware = await this.firmwareRepository.findById(id);
    if (!firmware) {
      throw new NotFoundException(`Firmware with ID ${id} not found`);
    }

    // Extract file key from URL
    const fileKey = this.extractFileKey(firmware.file.url);
    const buffer = await this.storageService.download(fileKey);

    const validation = await this.validationService.validateFirmware(buffer, fileKey, {
      expectedChecksum: firmware.file.checksum,
    });

    // Update status based on validation
    if (validation.isValid && firmware.status === FirmwareStatus.VALIDATING) {
      firmware.updateStatus(FirmwareStatus.READY);
      await this.firmwareRepository.update(id, { status: firmware.status });
    } else if (!validation.isValid) {
      firmware.updateStatus(FirmwareStatus.FAILED);
      await this.firmwareRepository.update(id, { status: firmware.status });
    }

    const checksum = this.validationService.calculateChecksum(buffer);

    return {
      isValid: validation.isValid,
      checksumValid: validation.checksumValid,
      signatureValid: validation.signatureValid,
      calculatedChecksum: checksum,
      fileSize: buffer.length,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  private parseDeviceTypes(deviceTypes: string | string[]): string[] {
    if (Array.isArray(deviceTypes)) {
      return deviceTypes;
    }
    return deviceTypes.split(',').map((t) => t.trim());
  }

  private extractFileKey(url: string): string {
    // Extract the file key from URL like "http://localhost:3100/api/v1/firmware/download/firmware/2.5.0/file.bin"
    const downloadPrefix = '/download/';
    const idx = url.indexOf(downloadPrefix);
    if (idx !== -1) {
      return url.substring(idx + downloadPrefix.length);
    }
    // Fallback: use last path segments
    const parts = url.split('/');
    return parts.slice(-3).join('/');
  }

  private toResponseDto(firmware: Firmware): FirmwareResponseDto {
    return {
      id: firmware.id,
      version: firmware.version,
      name: firmware.name,
      type: firmware.type,
      status: firmware.status,
      file: firmware.file,
      signature: firmware.signature,
      metadata: firmware.metadata,
      createdBy: firmware.createdBy,
      createdAt: firmware.createdAt,
      updatedAt: firmware.updatedAt,
      publishedAt: firmware.publishedAt,
      isReadyForDeployment: firmware.isReadyForDeployment(),
      ageInDays: firmware.getAgeInDays(),
    };
  }
}
