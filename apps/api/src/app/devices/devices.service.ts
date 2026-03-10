import { Injectable, NotFoundException } from '@nestjs/common';
import { Device, DeviceStatus, DeviceType, Location } from '@fleetforge/core';
import { DeviceRepository } from '@fleetforge/database';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DevicesService {
  constructor(private readonly deviceRepository: DeviceRepository) {}

  async create(createDeviceDto: CreateDeviceDto): Promise<DeviceResponseDto> {
    const device = new Device(
      uuidv4(),
      createDeviceDto.fleetId,
      createDeviceDto.name,
      createDeviceDto.type as DeviceType,
      DeviceStatus.REGISTERED,
      createDeviceDto.metadata,
      createDeviceDto.capabilities,
      createDeviceDto.firmwareVersion,
      new Date(),
    );

    const saved = await this.deviceRepository.create(device);
    return this.toResponseDto(saved);
  }

  async findAll(
    filter: { fleetId?: string; status?: string },
    limit = 100,
    offset = 0,
  ): Promise<DeviceResponseDto[]> {
    const devices = await this.deviceRepository.findMany(
      {
        fleetId: filter.fleetId,
        status: filter.status as DeviceStatus,
      },
      limit,
      offset,
    );

    return devices.map((device) => this.toResponseDto(device));
  }

  async findOne(id: string): Promise<DeviceResponseDto> {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return this.toResponseDto(device);
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<DeviceResponseDto> {
    const existing = await this.deviceRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    const updates: Partial<Device> = {};
    if (updateDeviceDto.name) updates.name = updateDeviceDto.name;
    if (updateDeviceDto.status) updates.status = updateDeviceDto.status as DeviceStatus;
    if (updateDeviceDto.tags) updates.tags = updateDeviceDto.tags;
    if (updateDeviceDto.firmwareVersion) updates.firmwareVersion = updateDeviceDto.firmwareVersion;

    const updated = await this.deviceRepository.update(id, updates);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    await this.deviceRepository.delete(id);
  }

  async updateLocation(
    id: string,
    locationData: { latitude: number; longitude: number; altitude?: number },
  ): Promise<DeviceResponseDto> {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    const location = new Location(
      locationData.latitude,
      locationData.longitude,
      new Date(),
      locationData.altitude,
    );

    const updated = await this.deviceRepository.update(id, { location });
    return this.toResponseDto(updated);
  }

  async updateHealth(
    id: string,
    health: {
      batteryLevel?: number;
      signalStrength?: number;
      temperature?: number;
      memoryUsage?: number;
      cpuUsage?: number;
    },
  ): Promise<DeviceResponseDto> {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    device.updateHealth(health);
    const updated = await this.deviceRepository.update(id, { health: device.health });
    return this.toResponseDto(updated);
  }

  async count(filter: { fleetId?: string; status?: string }): Promise<number> {
    return this.deviceRepository.count({
      fleetId: filter.fleetId,
      status: filter.status as DeviceStatus,
    });
  }

  private toResponseDto(device: Device): DeviceResponseDto {
    return {
      id: device.id,
      fleetId: device.fleetId,
      name: device.name,
      type: device.type,
      status: device.status,
      metadata: device.metadata,
      capabilities: device.capabilities,
      firmwareVersion: device.firmwareVersion,
      lastSeen: device.lastSeen,
      location: device.location,
      health: device.health,
      tags: device.tags,
      isOnline: device.isOnline(),
      isHealthy: device.isHealthy(),
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }
}
