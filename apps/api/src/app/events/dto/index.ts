/**
 * WebSocket Event DTOs
 */

import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  altitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;
}

export class TelemetryEventDto {
  @IsString()
  deviceId!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsObject()
  data?: Record<string, number | string | boolean | null>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(-120)
  @Max(0)
  signalStrength?: number;
}

export class DeviceStatusEventDto {
  @IsString()
  deviceId!: string;

  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SubscribeDeviceDto {
  @IsString()
  deviceId!: string;
}

export class SubscribeFleetDto {
  @IsString()
  fleetId!: string;
}

export interface WsResponse<T> {
  event: string;
  data: T;
}

export interface WsErrorResponse {
  event: 'error';
  data: {
    code: string;
    message: string;
    timestamp: Date;
  };
}

// Shadow (Digital Twin) Events
export class ShadowUpdateReportedDto {
  @IsString()
  deviceId!: string;

  @IsObject()
  state!: Record<string, unknown>;
}

export class ShadowUpdateDesiredDto {
  @IsString()
  deviceId!: string;

  @IsObject()
  state!: Record<string, unknown>;
}

export class ShadowGetDeltaDto {
  @IsString()
  deviceId!: string;
}

export class ShadowAckDto {
  @IsString()
  deviceId!: string;
}

export interface ShadowDeltaEvent {
  deviceId: string;
  delta: Record<string, unknown>;
  version: number;
  timestamp: Date;
}

export interface ShadowUpdateEvent {
  deviceId: string;
  reported?: Record<string, unknown>;
  desired?: Record<string, unknown>;
  delta: Record<string, unknown>;
  hasDelta: boolean;
  version: number;
  timestamp: Date;
}
