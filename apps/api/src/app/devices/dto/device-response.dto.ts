import { ApiProperty } from '@nestjs/swagger';
import { DeviceStatus, DeviceType, ILocation, IDeviceHealth } from '@fleetforge/core';

export class DeviceResponseDto {
  @ApiProperty({ example: 'device-123' })
  id!: string;

  @ApiProperty({ example: 'fleet-456' })
  fleetId!: string;

  @ApiProperty({ example: 'Tracker Unit 001' })
  name!: string;

  @ApiProperty({ enum: DeviceType, example: DeviceType.TRACKER })
  type!: DeviceType;

  @ApiProperty({ enum: DeviceStatus, example: DeviceStatus.ACTIVE })
  status!: DeviceStatus;

  @ApiProperty()
  metadata!: {
    manufacturer: string;
    model: string;
    hardwareVersion: string;
    serialNumber: string;
    manufactureDate?: Date;
  };

  @ApiProperty()
  capabilities!: {
    hasGPS: boolean;
    hasCamera: boolean;
    hasCellular: boolean;
    hasWiFi: boolean;
    hasBluetooth: boolean;
    sensors: string[];
  };

  @ApiProperty({ example: '1.0.0' })
  firmwareVersion!: string;

  @ApiProperty()
  lastSeen!: Date;

  @ApiProperty({ required: false })
  location?: ILocation;

  @ApiProperty({ required: false })
  health?: IDeviceHealth;

  @ApiProperty({ example: ['production'] })
  tags!: string[];

  @ApiProperty({ example: true })
  isOnline!: boolean;

  @ApiProperty({ example: true })
  isHealthy!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
