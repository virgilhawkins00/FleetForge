import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsArray, IsOptional } from 'class-validator';
import { FleetMetadataDto } from './create-fleet.dto';

export class UpdateFleetDto {
  @ApiProperty({ example: 'Updated Fleet Name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ type: FleetMetadataDto, required: false })
  @IsObject()
  @IsOptional()
  metadata?: FleetMetadataDto;

  @ApiProperty({ example: ['production'], required: false })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({ example: ['device-1', 'device-2'], required: false })
  @IsArray()
  @IsOptional()
  deviceIds?: string[];
}

