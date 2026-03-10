import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FleetsService } from './fleets.service';
import { CreateFleetDto } from './dto/create-fleet.dto';
import { UpdateFleetDto } from './dto/update-fleet.dto';
import { FleetResponseDto } from './dto/fleet-response.dto';

@ApiTags('fleets')
@Controller({ path: 'fleets', version: '1' })
export class FleetsController {
  constructor(private readonly fleetsService: FleetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new fleet' })
  @ApiResponse({ status: 201, description: 'Fleet created', type: FleetResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createFleetDto: CreateFleetDto): Promise<FleetResponseDto> {
    return this.fleetsService.create(createFleetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fleets' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of fleets', type: [FleetResponseDto] })
  async findAll(
    @Query('organizationId') organizationId?: string,
    @Query('tags') tags?: string[],
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<FleetResponseDto[]> {
    return this.fleetsService.findAll({ organizationId, tags }, limit, offset);
  }

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Get fleets by organization' })
  @ApiResponse({ status: 200, description: 'List of fleets', type: [FleetResponseDto] })
  async findByOrganization(
    @Param('organizationId') organizationId: string,
  ): Promise<FleetResponseDto[]> {
    return this.fleetsService.findByOrganization(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fleet by ID' })
  @ApiResponse({ status: 200, description: 'Fleet found', type: FleetResponseDto })
  @ApiResponse({ status: 404, description: 'Fleet not found' })
  async findOne(@Param('id') id: string): Promise<FleetResponseDto> {
    return this.fleetsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update fleet' })
  @ApiResponse({ status: 200, description: 'Fleet updated', type: FleetResponseDto })
  @ApiResponse({ status: 404, description: 'Fleet not found' })
  async update(
    @Param('id') id: string,
    @Body() updateFleetDto: UpdateFleetDto,
  ): Promise<FleetResponseDto> {
    return this.fleetsService.update(id, updateFleetDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete fleet' })
  @ApiResponse({ status: 204, description: 'Fleet deleted' })
  @ApiResponse({ status: 404, description: 'Fleet not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.fleetsService.remove(id);
  }

  @Post(':id/devices/:deviceId')
  @ApiOperation({ summary: 'Add device to fleet' })
  @ApiResponse({ status: 200, description: 'Device added', type: FleetResponseDto })
  async addDevice(
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
  ): Promise<FleetResponseDto> {
    return this.fleetsService.addDevice(id, deviceId);
  }

  @Delete(':id/devices/:deviceId')
  @ApiOperation({ summary: 'Remove device from fleet' })
  @ApiResponse({ status: 200, description: 'Device removed', type: FleetResponseDto })
  async removeDevice(
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
  ): Promise<FleetResponseDto> {
    return this.fleetsService.removeDevice(id, deviceId);
  }
}

