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
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceResponseDto } from './dto/device-response.dto';

@ApiTags('devices')
@ApiBearerAuth()
@Controller({ path: 'devices', version: '1' })
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Register a new device' })
  @ApiResponse({
    status: 201,
    description: 'Device successfully registered',
    type: DeviceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(@Body() createDeviceDto: CreateDeviceDto): Promise<DeviceResponseDto> {
    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  @Permissions(Permission.DEVICE_READ)
  @ApiOperation({ summary: 'Get all devices' })
  @ApiQuery({ name: 'fleetId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of devices',
    type: [DeviceResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('fleetId') fleetId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<DeviceResponseDto[]> {
    return this.devicesService.findAll({ fleetId, status }, limit, offset);
  }

  @Get(':id')
  @Permissions(Permission.DEVICE_READ)
  @ApiOperation({ summary: 'Get device by ID' })
  @ApiResponse({
    status: 200,
    description: 'Device found',
    type: DeviceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async findOne(@Param('id') id: string): Promise<DeviceResponseDto> {
    return this.devicesService.findOne(id);
  }

  @Put(':id')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Update device' })
  @ApiResponse({
    status: 200,
    description: 'Device updated',
    type: DeviceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ): Promise<DeviceResponseDto> {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Delete(':id')
  @Permissions(Permission.DEVICE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete device' })
  @ApiResponse({ status: 204, description: 'Device deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.devicesService.remove(id);
  }

  @Post(':id/location')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Update device location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async updateLocation(
    @Param('id') id: string,
    @Body() location: { latitude: number; longitude: number; altitude?: number },
  ): Promise<DeviceResponseDto> {
    return this.devicesService.updateLocation(id, location);
  }

  @Post(':id/health')
  @Permissions(Permission.DEVICE_WRITE)
  @ApiOperation({ summary: 'Update device health metrics' })
  @ApiResponse({ status: 200, description: 'Health metrics updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async updateHealth(
    @Param('id') id: string,
    @Body()
    health: {
      batteryLevel?: number;
      signalStrength?: number;
      temperature?: number;
      memoryUsage?: number;
      cpuUsage?: number;
    },
  ): Promise<DeviceResponseDto> {
    return this.devicesService.updateHealth(id, health);
  }
}
