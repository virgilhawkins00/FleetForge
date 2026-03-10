import { ApiProperty } from '@nestjs/swagger';
import { ILocation, ITelemetryData, ITelemetrySensor } from '@fleetforge/core';

export class TelemetryResponseDto {
  @ApiProperty({ example: 'telemetry-123' })
  id!: string;

  @ApiProperty({ example: 'device-456' })
  deviceId!: string;

  @ApiProperty()
  timestamp!: Date;

  @ApiProperty({ required: false })
  location?: ILocation;

  @ApiProperty({ example: { temperature: 25, humidity: 60 } })
  data!: ITelemetryData;

  @ApiProperty()
  sensors!: ITelemetrySensor[];

  @ApiProperty({ required: false, example: 85 })
  batteryLevel?: number;

  @ApiProperty({ required: false, example: -65 })
  signalStrength?: number;

  @ApiProperty()
  receivedAt!: Date;

  @ApiProperty({ example: 150, description: 'Latency in milliseconds' })
  latencyMs!: number;

  @ApiProperty({ example: false })
  isStale!: boolean;

  @ApiProperty({ example: false })
  isBatteryLow!: boolean;

  @ApiProperty({ example: false })
  isSignalWeak!: boolean;
}
