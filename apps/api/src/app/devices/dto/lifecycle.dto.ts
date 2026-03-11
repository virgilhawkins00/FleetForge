/**
 * Device Lifecycle DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, ArrayMinSize } from 'class-validator';
import { DeviceStatus, DeviceLifecycleEvent } from '@fleetforge/core';

export class TransitionDeviceDto {
  @ApiProperty({
    enum: DeviceStatus,
    description: 'Target device status',
    example: DeviceStatus.ACTIVE,
  })
  @IsEnum(DeviceStatus)
  status!: DeviceStatus;

  @ApiPropertyOptional({
    description: 'Reason for the transition',
    example: 'Scheduled maintenance completed',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BatchTransitionDto {
  @ApiProperty({
    description: 'Array of device IDs to transition',
    example: ['device-1', 'device-2'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  deviceIds!: string[];

  @ApiProperty({
    enum: DeviceStatus,
    description: 'Target device status',
    example: DeviceStatus.MAINTENANCE,
  })
  @IsEnum(DeviceStatus)
  status!: DeviceStatus;

  @ApiPropertyOptional({
    description: 'Reason for the transition',
    example: 'Bulk maintenance scheduling',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class LifecycleHistoryEntryDto {
  @ApiProperty({ enum: DeviceLifecycleEvent })
  event!: DeviceLifecycleEvent;

  @ApiProperty({ enum: DeviceStatus })
  fromStatus!: DeviceStatus;

  @ApiProperty({ enum: DeviceStatus })
  toStatus!: DeviceStatus;

  @ApiProperty()
  timestamp!: Date;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  performedBy?: string;
}

export class TransitionResultDto {
  @ApiProperty()
  deviceId!: string;

  @ApiProperty({ enum: DeviceLifecycleEvent })
  event!: DeviceLifecycleEvent;

  @ApiProperty({ enum: DeviceStatus })
  previousStatus!: DeviceStatus;

  @ApiProperty({ enum: DeviceStatus })
  newStatus!: DeviceStatus;

  @ApiProperty()
  timestamp!: Date;
}

export class AllowedTransitionsDto {
  @ApiProperty()
  deviceId!: string;

  @ApiProperty({ enum: DeviceStatus })
  currentStatus!: DeviceStatus;

  @ApiProperty({ type: [String], enum: DeviceStatus })
  allowedTransitions!: DeviceStatus[];
}

export class BatchTransitionResultDto {
  @ApiProperty({ type: [TransitionResultDto] })
  success!: TransitionResultDto[];

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        error: { type: 'string' },
      },
    },
  })
  failed!: Array<{ deviceId: string; error: string }>;
}

export class LifecycleStatsDto {
  @ApiProperty()
  totalDevices!: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byStatus!: Record<DeviceStatus, number>;

  @ApiProperty({ type: [LifecycleHistoryEntryDto] })
  recentTransitions!: LifecycleHistoryEntryDto[];
}

