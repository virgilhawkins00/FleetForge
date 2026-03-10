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

  @ApiProperty({ required: false, example: 10 })
  @IsNumber()
  @IsOptional()
  canaryPercentage?: number;

  @ApiProperty({ required: false, example: 4 })
  @IsNumber()
  @IsOptional()
  phaseCount?: number;

  @ApiProperty({ required: false, example: 60, description: 'Phase duration in minutes' })
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
