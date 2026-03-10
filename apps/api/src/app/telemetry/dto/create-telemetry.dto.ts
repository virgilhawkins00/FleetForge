import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsArray,
  IsOptional,
  IsNumber,
  IsDateString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TelemetryLocationDto {
  @ApiProperty({ example: -23.5505 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: -46.6333 })
  @IsNumber()
  longitude!: number;

  @ApiProperty({ required: false, example: 760 })
  @IsNumber()
  @IsOptional()
  altitude?: number;

  @ApiProperty({ required: false, example: 5 })
  @IsNumber()
  @IsOptional()
  accuracy?: number;

  @ApiProperty({ required: false, example: 60 })
  @IsNumber()
  @IsOptional()
  speed?: number;

  @ApiProperty({ required: false, example: 180 })
  @IsNumber()
  @IsOptional()
  heading?: number;

  @ApiProperty()
  @IsDateString()
  timestamp!: string;
}

export class TelemetrySensorDto {
  @ApiProperty({ example: 'temperature' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 25.5 })
  @IsNumber()
  value!: number;

  @ApiProperty({ example: '°C' })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiProperty()
  @IsDateString()
  timestamp!: string;
}

export class CreateTelemetryDto {
  @ApiProperty({ example: 'device-123' })
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @ApiProperty()
  @IsDateString()
  timestamp!: string;

  @ApiProperty({ required: false, type: TelemetryLocationDto })
  @IsObject()
  @ValidateNested()
  @Type(() => TelemetryLocationDto)
  @IsOptional()
  location?: TelemetryLocationDto;

  @ApiProperty({ required: false, example: { temperature: 25, humidity: 60 } })
  @IsObject()
  @IsOptional()
  data?: Record<string, number | string | boolean | null>;

  @ApiProperty({ required: false, type: [TelemetrySensorDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelemetrySensorDto)
  @IsOptional()
  sensors?: TelemetrySensorDto[];

  @ApiProperty({ required: false, example: 85 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  batteryLevel?: number;

  @ApiProperty({ required: false, example: -65 })
  @IsNumber()
  @Min(-120)
  @Max(0)
  @IsOptional()
  signalStrength?: number;
}
