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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions, Permission } from '@fleetforge/security';
import { FleetsService } from './fleets.service';
import { CreateFleetDto } from './dto/create-fleet.dto';
import { UpdateFleetDto } from './dto/update-fleet.dto';
import { FleetResponseDto } from './dto/fleet-response.dto';

@ApiTags('fleets')
@ApiBearerAuth()
@Controller({ path: 'fleets', version: '1' })
export class FleetsController {
  constructor(private readonly fleetsService: FleetsService) {}

  @Post()
  @Permissions(Permission.FLEET_WRITE)
  @ApiOperation({ summary: 'Create a new fleet' })
  @ApiResponse({ status: 201, description: 'Fleet created', type: FleetResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(@Body() createFleetDto: CreateFleetDto): Promise<FleetResponseDto> {
    return this.fleetsService.create(createFleetDto);
  }

  @Get()
  @Permissions(Permission.FLEET_READ)
  @ApiOperation({ summary: 'Get all fleets' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of fleets', type: [FleetResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('organizationId') organizationId?: string,
    @Query('tags') tags?: string[],
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<FleetResponseDto[]> {
    return this.fleetsService.findAll({ organizationId, tags }, limit, offset);
  }

  @Get('organization/:organizationId')
  @Permissions(Permission.FLEET_READ)
  @ApiOperation({ summary: 'Get fleets by organization' })
  @ApiResponse({ status: 200, description: 'List of fleets', type: [FleetResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByOrganization(
    @Param('organizationId') organizationId: string,
  ): Promise<FleetResponseDto[]> {
    return this.fleetsService.findByOrganization(organizationId);
  }

  @Get(':id')
  @Permissions(Permission.FLEET_READ)
  @ApiOperation({ summary: 'Get fleet by ID' })
  @ApiResponse({ status: 200, description: 'Fleet found', type: FleetResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Fleet not found' })
  async findOne(@Param('id') id: string): Promise<FleetResponseDto> {
    return this.fleetsService.findOne(id);
  }

  @Put(':id')
  @Permissions(Permission.FLEET_WRITE)
  @ApiOperation({ summary: 'Update fleet' })
  @ApiResponse({ status: 200, description: 'Fleet updated', type: FleetResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Fleet not found' })
  async update(
    @Param('id') id: string,
    @Body() updateFleetDto: UpdateFleetDto,
  ): Promise<FleetResponseDto> {
    return this.fleetsService.update(id, updateFleetDto);
  }

  @Delete(':id')
  @Permissions(Permission.FLEET_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete fleet' })
  @ApiResponse({ status: 204, description: 'Fleet deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Fleet not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.fleetsService.remove(id);
  }

  @Post(':id/devices/:deviceId')
  @Permissions(Permission.FLEET_WRITE)
  @ApiOperation({ summary: 'Add device to fleet' })
  @ApiResponse({ status: 200, description: 'Device added', type: FleetResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async addDevice(
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
  ): Promise<FleetResponseDto> {
    return this.fleetsService.addDevice(id, deviceId);
  }

  @Delete(':id/devices/:deviceId')
  @Permissions(Permission.FLEET_WRITE)
  @ApiOperation({ summary: 'Remove device from fleet' })
  @ApiResponse({ status: 200, description: 'Device removed', type: FleetResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async removeDevice(
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
  ): Promise<FleetResponseDto> {
    return this.fleetsService.removeDevice(id, deviceId);
  }
}
