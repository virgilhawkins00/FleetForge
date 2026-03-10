import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsArray,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { FirmwareType } from '@fleetforge/core';

export class FirmwareFileDto {
  @ApiProperty({ example: 'https://storage.example.com/firmware/v1.0.0.bin' })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiProperty({ example: 1048576 })
  @IsNumber()
  size!: number;

  @ApiProperty({ example: 'abc123def456' })
  @IsString()
  @IsNotEmpty()
  checksum!: string;

  @ApiProperty({ example: 'SHA-256' })
  @IsString()
  @IsNotEmpty()
  checksumAlgorithm!: string;
}

export class FirmwareSignatureDto {
  @ApiProperty({ example: 'RSA-SHA256' })
  @IsString()
  @IsNotEmpty()
  algorithm!: string;

  @ApiProperty({ example: 'base64-encoded-signature' })
  @IsString()
  @IsNotEmpty()
  signature!: string;

  @ApiProperty({ example: 'base64-encoded-public-key' })
  @IsString()
  @IsNotEmpty()
  publicKey!: string;
}

export class FirmwareMetadataDto {
  @ApiProperty({ example: ['TRACKER', 'TELEMATICS'] })
  @IsArray()
  @IsNotEmpty()
  deviceTypes!: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  minHardwareVersion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  maxHardwareVersion?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  requiredCapabilities?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  releaseNotes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  changelog?: string;
}

export class CreateFirmwareDto {
  @ApiProperty({ example: '2.5.0' })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiProperty({ example: 'Fleet Tracker Firmware' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: FirmwareType, example: FirmwareType.FULL })
  @IsEnum(FirmwareType)
  type!: FirmwareType;

  @ApiProperty({ type: FirmwareFileDto })
  @IsObject()
  file!: FirmwareFileDto;

  @ApiProperty({ type: FirmwareSignatureDto })
  @IsObject()
  signature!: FirmwareSignatureDto;

  @ApiProperty({ type: FirmwareMetadataDto })
  @IsObject()
  metadata!: FirmwareMetadataDto;

  @ApiProperty({ example: 'user-123' })
  @IsString()
  @IsNotEmpty()
  createdBy!: string;
}
