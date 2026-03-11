/**
 * Shadow DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateReportedStateDto {
  @ApiProperty({
    description: 'Reported state from device',
    example: { temperature: 25, humidity: 60, status: 'active' },
  })
  @IsObject()
  state!: Record<string, unknown>;
}

export class UpdateDesiredStateDto {
  @ApiProperty({
    description: 'Desired state from cloud/application',
    example: { targetTemperature: 22, mode: 'eco' },
  })
  @IsObject()
  state!: Record<string, unknown>;
}

export class ShadowStateResponseDto {
  @ApiProperty({ example: { temperature: 25, humidity: 60 } })
  reported!: Record<string, unknown>;

  @ApiProperty({ example: { targetTemperature: 22 } })
  desired!: Record<string, unknown>;

  @ApiProperty({ example: { targetTemperature: 22 } })
  delta!: Record<string, unknown>;
}

export class ShadowMetadataResponseDto {
  @ApiPropertyOptional()
  reported?: { timestamp: Date; version: number };

  @ApiPropertyOptional()
  desired?: { timestamp: Date; version: number };
}

export class ShadowResponseDto {
  @ApiProperty({ example: 'device-123' })
  id!: string;

  @ApiProperty({ example: 'device-123' })
  deviceId!: string;

  @ApiProperty({ type: ShadowStateResponseDto })
  state!: ShadowStateResponseDto;

  @ApiProperty({ type: ShadowMetadataResponseDto })
  metadata!: ShadowMetadataResponseDto;

  @ApiProperty({ example: 5 })
  version!: number;

  @ApiProperty({ example: true })
  hasDelta!: boolean;

  @ApiPropertyOptional()
  lastReportedAt?: Date;

  @ApiPropertyOptional()
  lastDesiredAt?: Date;

  @ApiPropertyOptional()
  lastSyncedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
