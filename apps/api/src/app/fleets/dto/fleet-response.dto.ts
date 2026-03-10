import { ApiProperty } from '@nestjs/swagger';
import { IFleetMetadata, IFleetStatistics } from '@fleetforge/core';

export class FleetResponseDto {
  @ApiProperty({ example: 'fleet-123' })
  id!: string;

  @ApiProperty({ example: 'Main Fleet' })
  name!: string;

  @ApiProperty({ example: 'org-456' })
  organizationId!: string;

  @ApiProperty()
  metadata!: IFleetMetadata;

  @ApiProperty({ example: ['device-1', 'device-2'] })
  deviceIds!: string[];

  @ApiProperty({ example: ['production'] })
  tags!: string[];

  @ApiProperty({ required: false })
  statistics?: IFleetStatistics;

  @ApiProperty({ example: 95.5 })
  healthPercentage!: number;

  @ApiProperty({ example: true })
  isHealthy!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
