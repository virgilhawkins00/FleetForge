import { Injectable, NotFoundException } from '@nestjs/common';
import { Device, DeviceStatus, DeviceType, Location } from '@fleetforge/core';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceResponseDto } from './dto/device-response.dto';

@Injectable()
export class DevicesService {
  // In-memory storage for demonstration
  // In production, this would be replaced with a repository implementation
  private devices: Map<string, Device> = new Map();

  async create(createDeviceDto: CreateDeviceDto): Promise<DeviceResponseDto> {
    const device = new Device(
      this.generateId(),
      createDeviceDto.fleetId,
      createDeviceDto.name,
      createDeviceDto.type as DeviceType,
      DeviceStatus.REGISTERED,
      createDeviceDto.metadata,
      createDeviceDto.capabilities,
      createDeviceDto.firmwareVersion,
      new Date(),
    );

    this.devices.set(device.id, device);
    return this.toResponseDto(device);
  }

  async findAll(
    filter: { fleetId?: string; status?: string },
    limit = 100,
    offset = 0,
  ): Promise<DeviceResponseDto[]> {
    let devices = Array.from(this.devices.values());

    if (filter.fleetId) {
      devices = devices.filter((d) => d.fleetId === filter.fleetId);
    }

    if (filter.status) {
      devices = devices.filter((d) => d.status === filter.status);
    }

    return devices
      .slice(offset, offset + limit)
      .map((device) => this.toResponseDto(device));
  }

  async findOne(id: string): Promise<DeviceResponseDto> {
    const device = this.devices.get(id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return this.toResponseDto(device);
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<DeviceResponseDto> {
    const device = this.devices.get(id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    if (updateDeviceDto.name) {
      device.name = updateDeviceDto.name;
    }

    if (updateDeviceDto.status) {
      device.updateStatus(updateDeviceDto.status as DeviceStatus);
    }

    if (updateDeviceDto.tags) {
      device.tags = updateDeviceDto.tags;
    }

    this.devices.set(id, device);
    return this.toResponseDto(device);
  }

  async remove(id: string): Promise<void> {
    const device = this.devices.get(id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    this.devices.delete(id);
  }

  async updateLocation(
    id: string,
    locationData: { latitude: number; longitude: number; altitude?: number },
  ): Promise<DeviceResponseDto> {
    const device = this.devices.get(id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    const location = new Location(
      locationData.latitude,
      locationData.longitude,
      new Date(),
      locationData.altitude,
    );

    device.updateLocation(location);
    this.devices.set(id, device);
    return this.toResponseDto(device);
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
    const device = this.devices.get(id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    device.updateHealth(health);
    this.devices.set(id, device);
    return this.toResponseDto(device);
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

  private generateId(): string {
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

