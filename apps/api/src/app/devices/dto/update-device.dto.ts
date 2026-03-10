import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { DeviceStatus } from '@fleetforge/core';

export class UpdateDeviceDto {
  @ApiProperty({ example: 'Tracker Unit 001 Updated', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    enum: DeviceStatus,
    example: DeviceStatus.ACTIVE,
    required: false,
  })
  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: string;

  @ApiProperty({
    example: ['production', 'high-priority'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({ example: '2.5.0', required: false })
  @IsString()
  @IsOptional()
  firmwareVersion?: string;
}
