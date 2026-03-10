import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsArray, IsOptional } from 'class-validator';

export class FleetMetadataDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, unknown>;
}

export class CreateFleetDto {
  @ApiProperty({ example: 'Main Fleet', description: 'Fleet name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'org-123', description: 'Organization ID' })
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @ApiProperty({ type: FleetMetadataDto, required: false })
  @IsObject()
  @IsOptional()
  metadata?: FleetMetadataDto;

  @ApiProperty({ example: ['production', 'east-region'], required: false })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
