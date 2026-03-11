/**
 * DTOs for Firmware Upload
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { FirmwareType } from '@fleetforge/core';
import { IValidationResult } from '../services/firmware-validation.service';

export class UploadFirmwareDto {
  @ApiProperty({ example: '2.5.0', description: 'Firmware version (semver)' })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiProperty({ example: 'Fleet Tracker Firmware', description: 'Human-readable name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: FirmwareType, example: FirmwareType.FULL })
  @IsEnum(FirmwareType)
  type!: FirmwareType;

  @ApiProperty({ example: ['TRACKER', 'TELEMATICS'], description: 'Compatible device types' })
  @IsArray()
  @IsNotEmpty()
  deviceTypes!: string[];

  @ApiPropertyOptional({ example: '1.0.0', description: 'Minimum hardware version' })
  @IsString()
  @IsOptional()
  minHardwareVersion?: string;

  @ApiPropertyOptional({ example: '3.0.0', description: 'Maximum hardware version' })
  @IsString()
  @IsOptional()
  maxHardwareVersion?: string;

  @ApiPropertyOptional({ example: ['GPS', 'BLE'], description: 'Required device capabilities' })
  @IsArray()
  @IsOptional()
  requiredCapabilities?: string[];

  @ApiPropertyOptional({ description: 'Release notes for this version' })
  @IsString()
  @IsOptional()
  releaseNotes?: string;

  @ApiPropertyOptional({ description: 'Changelog from previous version' })
  @IsString()
  @IsOptional()
  changelog?: string;

  @ApiPropertyOptional({ description: 'Skip signature validation (dev only)' })
  @IsBoolean()
  @IsOptional()
  skipValidation?: boolean;
}

export class FirmwareUploadResponseDto {
  @ApiProperty({ example: 'firmware-123' })
  id!: string;

  @ApiProperty({ example: '2.5.0' })
  version!: string;

  @ApiProperty({ example: 'Fleet Tracker Firmware' })
  name!: string;

  @ApiProperty({ enum: FirmwareType })
  type!: FirmwareType;

  @ApiProperty({ example: 'VALIDATING' })
  status!: string;

  @ApiProperty({ description: 'File information' })
  file!: {
    url: string;
    size: number;
    checksum: string;
    checksumAlgorithm: string;
  };

  @ApiProperty({ description: 'Validation results' })
  validation!: IValidationResult;

  @ApiProperty()
  createdAt!: Date;
}

export class ValidateFirmwareDto {
  @ApiPropertyOptional({ description: 'Expected SHA-256 checksum' })
  @IsString()
  @IsOptional()
  expectedChecksum?: string;

  @ApiPropertyOptional({ description: 'Base64-encoded signature' })
  @IsString()
  @IsOptional()
  signature?: string;

  @ApiPropertyOptional({ description: 'PEM-encoded public key' })
  @IsString()
  @IsOptional()
  publicKey?: string;

  @ApiPropertyOptional({ example: 'RSA-SHA256', description: 'Signature algorithm' })
  @IsString()
  @IsOptional()
  signatureAlgorithm?: string;
}

export class FirmwareValidationResponseDto {
  @ApiProperty({ example: true })
  isValid!: boolean;

  @ApiProperty({ example: true })
  checksumValid!: boolean;

  @ApiProperty({ example: true })
  signatureValid!: boolean;

  @ApiProperty({ example: 'abc123def456...', description: 'Calculated SHA-256 checksum' })
  calculatedChecksum!: string;

  @ApiProperty({ example: 1048576, description: 'File size in bytes' })
  fileSize!: number;

  @ApiProperty({ example: [], description: 'Validation errors' })
  errors!: string[];

  @ApiProperty({ example: [], description: 'Validation warnings' })
  warnings!: string[];
}

