/**
 * Fleet Operations DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsObject,
  IsOptional,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceStatus } from '@fleetforge/core';

// Filter DTO
export class DeviceFilterDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter by firmware version' })
  @IsOptional()
  @IsString()
  firmwareVersion?: string;

  @ApiPropertyOptional({ description: 'Filter by online status' })
  @IsOptional()
  online?: boolean;
}

// Batch Update Desired State
export class BatchUpdateDesiredStateDto {
  @ApiProperty({ description: 'Desired state to apply to all devices' })
  @IsObject()
  state!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Filter criteria for devices' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceFilterDto)
  filter?: DeviceFilterDto;
}

// Batch Transition
export class BatchTransitionDto {
  @ApiProperty({ enum: DeviceStatus, description: 'Target status' })
  @IsEnum(DeviceStatus)
  status!: DeviceStatus;

  @ApiPropertyOptional({ description: 'Reason for transition' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Filter criteria for devices' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceFilterDto)
  filter?: DeviceFilterDto;
}

// Send Command
export class SendCommandDto {
  @ApiProperty({ description: 'Command name' })
  @IsString()
  command!: string;

  @ApiPropertyOptional({ description: 'Command parameters' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Command timeout in ms', default: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeout?: number;

  @ApiPropertyOptional({ description: 'Filter criteria for devices' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceFilterDto)
  filter?: DeviceFilterDto;
}

// Batch Tags
export class BatchTagsDto {
  @ApiProperty({ description: 'Tags to add/remove', type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @ApiPropertyOptional({ description: 'Filter criteria for devices' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceFilterDto)
  filter?: DeviceFilterDto;
}

// Bulk Sync
export class BulkSyncDto {
  @ApiProperty({ description: 'Device IDs to mark as synced', type: [String] })
  @IsArray()
  @IsString({ each: true })
  deviceIds!: string[];
}

// Response DTOs
export class BatchOperationResultDto<T> {
  @ApiProperty({ description: 'Successful operations' })
  success!: T[];

  @ApiProperty({ description: 'Failed operations' })
  failed!: Array<{ deviceId: string; error: string }>;

  @ApiProperty({ description: 'Total processed' })
  totalProcessed!: number;

  @ApiProperty({ description: 'Success count' })
  successCount!: number;

  @ApiProperty({ description: 'Failed count' })
  failedCount!: number;
}

export class FleetSummaryDto {
  @ApiProperty()
  fleetId!: string;

  @ApiProperty()
  fleetName!: string;

  @ApiProperty()
  totalDevices!: number;

  @ApiProperty()
  byStatus!: Record<string, number>;

  @ApiProperty()
  onlineCount!: number;

  @ApiProperty()
  offlineCount!: number;

  @ApiProperty()
  healthyCount!: number;

  @ApiProperty()
  unhealthyCount!: number;
}
