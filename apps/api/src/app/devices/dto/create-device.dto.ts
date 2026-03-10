import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsArray, IsOptional, IsEnum } from 'class-validator';
import { DeviceType } from '@fleetforge/core';

export class CreateDeviceDto {
  @ApiProperty({ example: 'fleet-123', description: 'Fleet ID' })
  @IsString()
  @IsNotEmpty()
  fleetId!: string;

  @ApiProperty({ example: 'Tracker Unit 001', description: 'Device name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    enum: DeviceType,
    example: DeviceType.TRACKER,
    description: 'Device type',
  })
  @IsEnum(DeviceType)
  type!: string;

  @ApiProperty({
    example: {
      manufacturer: 'Acme Corp',
      model: 'T-1000',
      hardwareVersion: '2.0',
      serialNumber: 'SN123456',
    },
    description: 'Device metadata',
  })
  @IsObject()
  metadata!: {
    manufacturer: string;
    model: string;
    hardwareVersion: string;
    serialNumber: string;
    manufactureDate?: Date;
  };

  @ApiProperty({
    example: {
      hasGPS: true,
      hasCamera: false,
      hasCellular: true,
      hasWiFi: false,
      hasBluetooth: true,
      sensors: ['accelerometer', 'gyroscope'],
    },
    description: 'Device capabilities',
  })
  @IsObject()
  capabilities!: {
    hasGPS: boolean;
    hasCamera: boolean;
    hasCellular: boolean;
    hasWiFi: boolean;
    hasBluetooth: boolean;
    sensors: string[];
  };

  @ApiProperty({ example: '1.0.0', description: 'Firmware version' })
  @IsString()
  @IsNotEmpty()
  firmwareVersion!: string;

  @ApiProperty({
    example: ['production', 'high-priority'],
    description: 'Device tags',
    required: false,
  })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
