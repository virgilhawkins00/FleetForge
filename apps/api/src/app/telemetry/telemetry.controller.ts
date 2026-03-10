import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { TelemetryResponseDto } from './dto/telemetry-response.dto';

@ApiTags('telemetry')
@Controller({ path: 'telemetry', version: '1' })
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post()
  @ApiOperation({ summary: 'Ingest telemetry data' })
  @ApiResponse({ status: 201, description: 'Telemetry created', type: TelemetryResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createTelemetryDto: CreateTelemetryDto): Promise<TelemetryResponseDto> {
    return this.telemetryService.create(createTelemetryDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk ingest telemetry data' })
  @ApiResponse({ status: 201, description: 'Telemetry created', type: [TelemetryResponseDto] })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async bulkCreate(@Body() createTelemetryDtos: CreateTelemetryDto[]): Promise<TelemetryResponseDto[]> {
    return this.telemetryService.bulkCreate(createTelemetryDtos);
  }

  @Get()
  @ApiOperation({ summary: 'Get telemetry data' })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Telemetry list', type: [TelemetryResponseDto] })
  async findAll(
    @Query('deviceId') deviceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<TelemetryResponseDto[]> {
    const filter = {
      deviceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };
    return this.telemetryService.findAll(filter, limit, offset);
  }

  @Get('device/:deviceId/latest')
  @ApiOperation({ summary: 'Get latest telemetry for device' })
  @ApiResponse({ status: 200, description: 'Latest telemetry', type: TelemetryResponseDto })
  @ApiResponse({ status: 404, description: 'No telemetry found' })
  async findLatestByDevice(@Param('deviceId') deviceId: string): Promise<TelemetryResponseDto> {
    return this.telemetryService.findLatestByDevice(deviceId);
  }

  @Get('count')
  @ApiOperation({ summary: 'Count telemetry records' })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Record count', type: Number })
  async count(
    @Query('deviceId') deviceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<number> {
    const filter = {
      deviceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };
    return this.telemetryService.count(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get telemetry by ID' })
  @ApiResponse({ status: 200, description: 'Telemetry found', type: TelemetryResponseDto })
  @ApiResponse({ status: 404, description: 'Telemetry not found' })
  async findOne(@Param('id') id: string): Promise<TelemetryResponseDto> {
    return this.telemetryService.findOne(id);
  }

  @Delete('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete old telemetry data' })
  @ApiQuery({ name: 'days', required: true, type: Number, description: 'Delete data older than N days' })
  @ApiResponse({ status: 200, description: 'Number of deleted records' })
  async cleanup(@Query('days') days: number): Promise<{ deleted: number }> {
    const deleted = await this.telemetryService.deleteOlderThan(days);
    return { deleted };
  }
}

