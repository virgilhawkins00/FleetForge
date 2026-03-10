import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Firmware, FirmwareStatus, FirmwareSignature } from '@fleetforge/core';
import { FirmwareRepository } from '@fleetforge/database';
import { CreateFirmwareDto } from './dto/create-firmware.dto';
import { UpdateFirmwareDto } from './dto/update-firmware.dto';
import { FirmwareResponseDto } from './dto/firmware-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FirmwareService {
  constructor(private readonly firmwareRepository: FirmwareRepository) {}

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
