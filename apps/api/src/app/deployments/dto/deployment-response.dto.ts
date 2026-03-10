import { ApiProperty } from '@nestjs/swagger';
import { DeploymentStatus, IDeploymentConfig, IDeploymentProgress } from '@fleetforge/core';

export class DeploymentResponseDto {
  @ApiProperty({ example: 'deployment-123' })
  id!: string;

  @ApiProperty({ example: 'firmware-456' })
  firmwareId!: string;

  @ApiProperty({ example: '2.5.0' })
  firmwareVersion!: string;

  @ApiProperty({ example: 'Production Rollout Q2' })
  name!: string;

  @ApiProperty({ enum: DeploymentStatus })
  status!: DeploymentStatus;

  @ApiProperty()
  config!: IDeploymentConfig;

  @ApiProperty()
  progress!: IDeploymentProgress;

  @ApiProperty({ example: 'user-123' })
  createdBy!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ required: false })
  startedAt?: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty({ example: [] })
  errors!: string[];

  @ApiProperty({ example: 85.5 })
  successRate!: number;

  @ApiProperty({ required: false, example: 45 })
  durationMinutes!: number | null;

  @ApiProperty({ example: false })
  isScheduled!: boolean;
}
