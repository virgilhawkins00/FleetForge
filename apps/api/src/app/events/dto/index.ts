/**
 * WebSocket Event DTOs
 */

import { IsString, IsNumber, IsOptional, IsObject, ValidateNested, Min, Max } from 'class-validator';
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

