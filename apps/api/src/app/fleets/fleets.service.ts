import { Injectable, NotFoundException } from '@nestjs/common';
import { Fleet } from '@fleetforge/core';
import { FleetRepository } from '@fleetforge/database';
import { CreateFleetDto } from './dto/create-fleet.dto';
import { UpdateFleetDto } from './dto/update-fleet.dto';
import { FleetResponseDto } from './dto/fleet-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FleetsService {
  constructor(private readonly fleetRepository: FleetRepository) {}

  async create(createFleetDto: CreateFleetDto): Promise<FleetResponseDto> {
    const fleet = new Fleet(
      uuidv4(),
      createFleetDto.name,
      createFleetDto.organizationId,
      createFleetDto.metadata || {},
      [],
      createFleetDto.tags || [],
    );

    const saved = await this.fleetRepository.create(fleet);
    return this.toResponseDto(saved);
  }

  async findAll(
    filter: { organizationId?: string; tags?: string[] },
    limit = 100,
    offset = 0,
  ): Promise<FleetResponseDto[]> {
    const fleets = await this.fleetRepository.findMany(filter, limit, offset);
    return fleets.map((fleet) => this.toResponseDto(fleet));
  }

  async findOne(id: string): Promise<FleetResponseDto> {
    const fleet = await this.fleetRepository.findById(id);
    if (!fleet) {
      throw new NotFoundException(`Fleet with ID ${id} not found`);
    }
    return this.toResponseDto(fleet);
  }

  async findByOrganization(organizationId: string): Promise<FleetResponseDto[]> {
    const fleets = await this.fleetRepository.findByOrganization(organizationId);
    return fleets.map((fleet) => this.toResponseDto(fleet));
  }

  async update(id: string, updateFleetDto: UpdateFleetDto): Promise<FleetResponseDto> {
    const existing = await this.fleetRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Fleet with ID ${id} not found`);
    }

    const updates: Partial<Fleet> = {};
    if (updateFleetDto.name) updates.name = updateFleetDto.name;
    if (updateFleetDto.metadata) updates.metadata = updateFleetDto.metadata;
    if (updateFleetDto.tags) updates.tags = updateFleetDto.tags;
    if (updateFleetDto.deviceIds) updates.deviceIds = updateFleetDto.deviceIds;

    const updated = await this.fleetRepository.update(id, updates);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const fleet = await this.fleetRepository.findById(id);
    if (!fleet) {
      throw new NotFoundException(`Fleet with ID ${id} not found`);
    }
    await this.fleetRepository.delete(id);
  }

  async addDevice(fleetId: string, deviceId: string): Promise<FleetResponseDto> {
    const fleet = await this.fleetRepository.findById(fleetId);
    if (!fleet) {
      throw new NotFoundException(`Fleet with ID ${fleetId} not found`);
    }

    fleet.addDevice(deviceId);
    const updated = await this.fleetRepository.update(fleetId, { deviceIds: fleet.deviceIds });
    return this.toResponseDto(updated);
  }

  async removeDevice(fleetId: string, deviceId: string): Promise<FleetResponseDto> {
    const fleet = await this.fleetRepository.findById(fleetId);
    if (!fleet) {
      throw new NotFoundException(`Fleet with ID ${fleetId} not found`);
    }

    fleet.removeDevice(deviceId);
    const updated = await this.fleetRepository.update(fleetId, { deviceIds: fleet.deviceIds });
    return this.toResponseDto(updated);
  }

  async count(filter: { organizationId?: string }): Promise<number> {
    return this.fleetRepository.count(filter);
  }

  private toResponseDto(fleet: Fleet): FleetResponseDto {
    return {
      id: fleet.id,
      name: fleet.name,
      organizationId: fleet.organizationId,
      metadata: fleet.metadata,
      deviceIds: fleet.deviceIds,
      tags: fleet.tags,
      statistics: fleet.statistics,
      healthPercentage: fleet.getHealthPercentage(),
      isHealthy: fleet.isHealthy(),
      createdAt: fleet.createdAt,
      updatedAt: fleet.updatedAt,
    };
  }
}

