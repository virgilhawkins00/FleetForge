/**
 * Device Deployment DTOs
 */

import { IsString, IsNumber, IsOptional, IsEnum, ValidateNested, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DeviceDeploymentStatus } from '@fleetforge/core';

export class DeviceDeploymentErrorDto {
  @ApiProperty({ description: 'Error code' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Error message' })
  @IsString()
  message!: string;

  @ApiProperty({ description: 'Whether the error is retryable' })
  @IsBoolean()
  retryable!: boolean;
}

export class UpdateDeviceProgressDto {
  @ApiPropertyOptional({ enum: DeviceDeploymentStatus, description: 'New status' })
  @IsOptional()
  @IsEnum(DeviceDeploymentStatus)
  status?: DeviceDeploymentStatus;

  @ApiPropertyOptional({ description: 'Progress percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({ type: DeviceDeploymentErrorDto, description: 'Error details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceDeploymentErrorDto)
  error?: DeviceDeploymentErrorDto;
}

export class DeviceDeploymentMetricsDto {
  @ApiPropertyOptional() downloadStartedAt?: Date;
  @ApiPropertyOptional() downloadCompletedAt?: Date;
  @ApiPropertyOptional() installStartedAt?: Date;
  @ApiPropertyOptional() installCompletedAt?: Date;
  @ApiPropertyOptional() downloadDurationMs?: number;
  @ApiPropertyOptional() installDurationMs?: number;
  @ApiProperty() downloadRetries!: number;
  @ApiProperty() installRetries!: number;
}

export class DeviceDeploymentResponseDto {
  @ApiProperty({ description: 'Device deployment ID' })
  id!: string;

  @ApiProperty({ description: 'Parent deployment ID' })
  deploymentId!: string;

  @ApiProperty({ description: 'Target device ID' })
  deviceId!: string;

  @ApiProperty({ description: 'Firmware ID' })
  firmwareId!: string;

  @ApiProperty({ enum: DeviceDeploymentStatus, description: 'Current status' })
  status!: DeviceDeploymentStatus;

  @ApiPropertyOptional({ description: 'Previous firmware version' })
  previousFirmwareVersion?: string;

  @ApiProperty({ description: 'Target firmware version' })
  targetFirmwareVersion!: string;

  @ApiProperty({ description: 'Progress percentage' })
  progress!: number;

  @ApiProperty({ type: DeviceDeploymentMetricsDto, description: 'Timing metrics' })
  metrics!: DeviceDeploymentMetricsDto;

  @ApiProperty({ type: [DeviceDeploymentErrorDto], description: 'Errors encountered' })
  errors!: DeviceDeploymentErrorDto[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Completion timestamp' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Rollback reason if rolled back' })
  rollbackReason?: string;
}

export class DeviceDeploymentStatsDto {
  @ApiProperty() total!: number;
  @ApiProperty() pending!: number;
  @ApiProperty() downloading!: number;
  @ApiProperty() downloaded!: number;
  @ApiProperty() installing!: number;
  @ApiProperty() rebooting!: number;
  @ApiProperty() succeeded!: number;
  @ApiProperty() failed!: number;
  @ApiProperty() rolledBack!: number;
  @ApiProperty() skipped!: number;
}

export class RollbackDeploymentDto {
  @ApiProperty({ description: 'Reason for rollback' })
  @IsString()
  reason!: string;
}

