import { ApiProperty } from '@nestjs/swagger';
import {
  FirmwareStatus,
  FirmwareType,
  IFirmwareFile,
  IFirmwareMetadata,
  IFirmwareSignature,
} from '@fleetforge/core';

export class FirmwareResponseDto {
  @ApiProperty({ example: 'firmware-123' })
  id!: string;

  @ApiProperty({ example: '2.5.0' })
  version!: string;

  @ApiProperty({ example: 'Fleet Tracker Firmware' })
  name!: string;

  @ApiProperty({ enum: FirmwareType })
  type!: FirmwareType;

  @ApiProperty({ enum: FirmwareStatus })
  status!: FirmwareStatus;

  @ApiProperty()
  file!: IFirmwareFile;

  @ApiProperty()
  signature!: IFirmwareSignature;

  @ApiProperty()
  metadata!: IFirmwareMetadata;

  @ApiProperty({ example: 'user-123' })
  createdBy!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ required: false })
  publishedAt?: Date;

  @ApiProperty({ example: true })
  isReadyForDeployment!: boolean;

  @ApiProperty({ example: 30 })
  ageInDays!: number;
}
