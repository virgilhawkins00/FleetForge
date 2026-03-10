import { Injectable, NotFoundException } from '@nestjs/common';
import { Telemetry, ILocation, ITelemetrySensor } from '@fleetforge/core';
import { TelemetryRepository } from '@fleetforge/database';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { TelemetryResponseDto } from './dto/telemetry-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TelemetryService {
  constructor(private readonly telemetryRepository: TelemetryRepository) {}

  async create(createTelemetryDto: CreateTelemetryDto): Promise<TelemetryResponseDto> {
    let location: ILocation | undefined;
    if (createTelemetryDto.location) {
      location = {
        latitude: createTelemetryDto.location.latitude,
        longitude: createTelemetryDto.location.longitude,
        altitude: createTelemetryDto.location.altitude,
        accuracy: createTelemetryDto.location.accuracy,
        speed: createTelemetryDto.location.speed,
        heading: createTelemetryDto.location.heading,
        timestamp: new Date(createTelemetryDto.location.timestamp),
      };
    }

    const sensors: ITelemetrySensor[] = (createTelemetryDto.sensors || []).map((s) => ({
      name: s.name,
      value: s.value,
      unit: s.unit,
      timestamp: new Date(s.timestamp),
    }));

    const telemetry = new Telemetry(
      uuidv4(),
      createTelemetryDto.deviceId,
      new Date(createTelemetryDto.timestamp),
      location,
      createTelemetryDto.data || {},
      sensors,
      createTelemetryDto.batteryLevel,
      createTelemetryDto.signalStrength,
    );

    const saved = await this.telemetryRepository.create(telemetry);
    return this.toResponseDto(saved);
  }

  async bulkCreate(createTelemetryDtos: CreateTelemetryDto[]): Promise<TelemetryResponseDto[]> {
    const telemetryList = createTelemetryDtos.map((dto) => {
      let location: ILocation | undefined;
      if (dto.location) {
        location = {
          latitude: dto.location.latitude,
          longitude: dto.location.longitude,
          altitude: dto.location.altitude,
          accuracy: dto.location.accuracy,
          speed: dto.location.speed,
          heading: dto.location.heading,
          timestamp: new Date(dto.location.timestamp),
        };
      }

      const sensors: ITelemetrySensor[] = (dto.sensors || []).map((s) => ({
        name: s.name,
        value: s.value,
        unit: s.unit,
        timestamp: new Date(s.timestamp),
      }));

      return new Telemetry(
        uuidv4(),
        dto.deviceId,
        new Date(dto.timestamp),
        location,
        dto.data || {},
        sensors,
        dto.batteryLevel,
        dto.signalStrength,
      );
    });

    const saved = await this.telemetryRepository.bulkCreate(telemetryList);
    return saved.map((t) => this.toResponseDto(t));
  }

  async findAll(
    filter: { deviceId?: string; startDate?: Date; endDate?: Date },
    limit = 100,
    offset = 0,
  ): Promise<TelemetryResponseDto[]> {
    const telemetryList = await this.telemetryRepository.findMany(filter, limit, offset);
    return telemetryList.map((t) => this.toResponseDto(t));
  }

  async findOne(id: string): Promise<TelemetryResponseDto> {
    const telemetry = await this.telemetryRepository.findById(id);
    if (!telemetry) {
      throw new NotFoundException(`Telemetry with ID ${id} not found`);
    }
    return this.toResponseDto(telemetry);
  }

  async findLatestByDevice(deviceId: string): Promise<TelemetryResponseDto> {
    const telemetry = await this.telemetryRepository.findLatestByDevice(deviceId);
    if (!telemetry) {
      throw new NotFoundException(`No telemetry found for device ${deviceId}`);
    }
    return this.toResponseDto(telemetry);
  }

  async count(filter: { deviceId?: string; startDate?: Date; endDate?: Date }): Promise<number> {
    return this.telemetryRepository.count(filter);
  }

  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.telemetryRepository.deleteOlderThan(cutoffDate);
  }

  private toResponseDto(telemetry: Telemetry): TelemetryResponseDto {
    return {
      id: telemetry.id,
      deviceId: telemetry.deviceId,
      timestamp: telemetry.timestamp,
      location: telemetry.location,
      data: telemetry.data,
      sensors: telemetry.sensors,
      batteryLevel: telemetry.batteryLevel,
      signalStrength: telemetry.signalStrength,
      receivedAt: telemetry.receivedAt,
      latencyMs: telemetry.getLatency(),
      isStale: telemetry.isStale(),
      isBatteryLow: telemetry.isBatteryLow(),
      isSignalWeak: telemetry.isSignalWeak(),
    };
  }
}

