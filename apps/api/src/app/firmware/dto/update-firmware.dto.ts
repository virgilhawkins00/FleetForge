import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { FirmwareStatus } from '@fleetforge/core';
import { FirmwareMetadataDto } from './create-firmware.dto';

export class UpdateFirmwareDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: FirmwareStatus, required: false })
  @IsEnum(FirmwareStatus)
  @IsOptional()
  status?: FirmwareStatus;

  @ApiProperty({ type: FirmwareMetadataDto, required: false })
  @IsOptional()
  metadata?: Partial<FirmwareMetadataDto>;
}

