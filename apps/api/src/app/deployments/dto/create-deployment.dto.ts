import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsArray,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeploymentStrategy } from '@fleetforge/core';

export class DeploymentTargetDto {
  @ApiProperty({ required: false, example: ['device-1', 'device-2'] })
  @IsArray()
  @IsOptional()
  deviceIds?: string[];

  @ApiProperty({ required: false, example: ['fleet-1'] })
  @IsArray()
  @IsOptional()
  fleetIds?: string[];

  @ApiProperty({ required: false, example: ['production'] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false, example: 25 })
  @IsNumber()
  @IsOptional()
  percentage?: number;
}

/**
 * Canary Strategy Configuration DTO
 */
export class CanaryConfigDto {
  @ApiProperty({ required: false, default: 5, description: 'Percentage of devices for canary' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  percentage?: number;

  @ApiProperty({ required: false, default: 30, description: 'Observation time in minutes' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  observationTimeMinutes?: number;

  @ApiProperty({
    required: false,
    default: 95,
    description: 'Success rate threshold for promotion',
  })
  @IsNumber()
  @IsOptional()
  @Min(50)
  @Max(100)
  successThreshold?: number;

  @ApiProperty({ required: false, default: true, description: 'Auto-promote if canary succeeds' })
  @IsBoolean()
  @IsOptional()
  autoPromote?: boolean;

  @ApiProperty({ required: false, default: 30, description: 'Health check interval in seconds' })
  @IsNumber()
  @IsOptional()
  @Min(5)
  healthCheckIntervalSeconds?: number;
}

/**
 * Rolling Strategy Configuration DTO
 */
export class RollingConfigDto {
  @ApiProperty({ required: false, description: 'Absolute batch size (number of devices)' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  batchSize?: number;

  @ApiProperty({ required: false, default: 10, description: 'Batch size as percentage' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  batchPercentage?: number;

  @ApiProperty({ required: false, default: 5, description: 'Delay between batches in minutes' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  batchDelayMinutes?: number;

  @ApiProperty({ required: false, default: 1, description: 'Maximum concurrent batches' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  maxConcurrentBatches?: number;

  @ApiProperty({ required: false, default: true, description: 'Verify health between batches' })
  @IsBoolean()
  @IsOptional()
  verifyHealthBetweenBatches?: boolean;

  @ApiProperty({ required: false, default: true, description: 'Pause on batch failure' })
  @IsBoolean()
  @IsOptional()
  pauseOnBatchFailure?: boolean;

  @ApiProperty({ required: false, default: 10, description: 'Batch failure threshold percentage' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  batchFailureThreshold?: number;
}

/**
 * Deployment Wave DTO for Phased Strategy
 */
export class DeploymentWaveDto {
  @ApiProperty({ example: 'Pilot', description: 'Wave name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 10, description: 'Percentage of devices for this wave' })
  @IsNumber()
  @Min(1)
  @Max(100)
  percentage!: number;

  @ApiProperty({ required: false, description: 'Delay after previous wave in minutes' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  delayMinutes?: number;

  @ApiProperty({ required: false, default: false, description: 'Require manual approval' })
  @IsBoolean()
  @IsOptional()
  requireApproval?: boolean;

  @ApiProperty({ required: false, description: 'Target specific tags for this wave' })
  @IsArray()
  @IsOptional()
  targetTags?: string[];
}

/**
 * Phased Strategy Configuration DTO
 */
export class PhasedConfigDto {
  @ApiProperty({ required: false, type: [DeploymentWaveDto], description: 'Wave definitions' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeploymentWaveDto)
  waves?: DeploymentWaveDto[];

  @ApiProperty({ required: false, default: 5, description: 'Number of phases (if waves not set)' })
  @IsNumber()
  @IsOptional()
  @Min(2)
  @Max(10)
  phaseCount?: number;

  @ApiProperty({ required: false, default: 60, description: 'Delay between phases in minutes' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  phaseDelayMinutes?: number;

  @ApiProperty({ required: false, default: false, description: 'Require approval between phases' })
  @IsBoolean()
  @IsOptional()
  requireApproval?: boolean;

  @ApiProperty({ required: false, default: true, description: 'Auto-advance if threshold met' })
  @IsBoolean()
  @IsOptional()
  autoAdvance?: boolean;

  @ApiProperty({ required: false, default: 90, description: 'Success rate to advance' })
  @IsNumber()
  @IsOptional()
  @Min(50)
  @Max(100)
  advanceThreshold?: number;
}

export class DeploymentConfigDto {
  @ApiProperty({ enum: DeploymentStrategy, example: DeploymentStrategy.CANARY })
  @IsEnum(DeploymentStrategy)
  strategy!: DeploymentStrategy;

  @ApiProperty({ type: DeploymentTargetDto })
  @IsObject()
  @ValidateNested()
  @Type(() => DeploymentTargetDto)
  target!: DeploymentTargetDto;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiProperty({ required: false, example: 10, deprecated: true })
  @IsNumber()
  @IsOptional()
  canaryPercentage?: number;

  @ApiProperty({ required: false, example: 4, deprecated: true })
  @IsNumber()
  @IsOptional()
  phaseCount?: number;

  @ApiProperty({ required: false, example: 60, deprecated: true })
  @IsNumber()
  @IsOptional()
  phaseDuration?: number;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  autoRollback?: boolean;

  @ApiProperty({ required: false, example: 10, description: 'Failure percentage for rollback' })
  @IsNumber()
  @IsOptional()
  rollbackThreshold?: number;

  @ApiProperty({ required: false, type: CanaryConfigDto, description: 'Canary strategy config' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => CanaryConfigDto)
  canary?: CanaryConfigDto;

  @ApiProperty({ required: false, type: RollingConfigDto, description: 'Rolling strategy config' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => RollingConfigDto)
  rolling?: RollingConfigDto;

  @ApiProperty({ required: false, type: PhasedConfigDto, description: 'Phased strategy config' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PhasedConfigDto)
  phased?: PhasedConfigDto;
}

export class CreateDeploymentDto {
  @ApiProperty({ example: 'firmware-123' })
  @IsString()
  @IsNotEmpty()
  firmwareId!: string;

  @ApiProperty({ example: '2.5.0' })
  @IsString()
  @IsNotEmpty()
  firmwareVersion!: string;

  @ApiProperty({ example: 'Production Rollout Q2' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ type: DeploymentConfigDto })
  @IsObject()
  @ValidateNested()
  @Type(() => DeploymentConfigDto)
  config!: DeploymentConfigDto;

  @ApiProperty({ example: 'user-123' })
  @IsString()
  @IsNotEmpty()
  createdBy!: string;
}
