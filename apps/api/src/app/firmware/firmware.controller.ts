import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions, Permission } from '@fleetforge/security';
import { FirmwareStatus } from '@fleetforge/core';
import { FirmwareService } from './firmware.service';
import { CreateFirmwareDto } from './dto/create-firmware.dto';
import { UpdateFirmwareDto } from './dto/update-firmware.dto';
import { FirmwareResponseDto } from './dto/firmware-response.dto';

@ApiTags('firmware')
@ApiBearerAuth()
@Controller({ path: 'firmware', version: '1' })
export class FirmwareController {
  constructor(private readonly firmwareService: FirmwareService) {}

  @Post()
  @Permissions(Permission.FIRMWARE_WRITE)
  @ApiOperation({ summary: 'Upload new firmware' })
  @ApiResponse({ status: 201, description: 'Firmware created', type: FirmwareResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(@Body() createFirmwareDto: CreateFirmwareDto): Promise<FirmwareResponseDto> {
    return this.firmwareService.create(createFirmwareDto);
  }

  @Get()
  @Permissions(Permission.FIRMWARE_READ)
  @ApiOperation({ summary: 'Get all firmware packages' })
  @ApiQuery({ name: 'status', required: false, enum: FirmwareStatus })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of firmware', type: [FirmwareResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('status') status?: FirmwareStatus,
    @Query('createdBy') createdBy?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<FirmwareResponseDto[]> {
    return this.firmwareService.findAll({ status, createdBy }, limit, offset);
  }

  @Get('version/:version')
  @Permissions(Permission.FIRMWARE_READ)
  @ApiOperation({ summary: 'Get firmware by version' })
  @ApiResponse({ status: 200, description: 'Firmware found', type: FirmwareResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Firmware not found' })
  async findByVersion(@Param('version') version: string): Promise<FirmwareResponseDto> {
    return this.firmwareService.findByVersion(version);
  }

  @Get('compatible/:deviceType')
  @Permissions(Permission.FIRMWARE_READ)
  @ApiOperation({ summary: 'Get compatible firmware for device type' })
  @ApiResponse({
    status: 200,
    description: 'Compatible firmware list',
    type: [FirmwareResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findCompatible(@Param('deviceType') deviceType: string): Promise<FirmwareResponseDto[]> {
    return this.firmwareService.findCompatible(deviceType);
  }

  @Get(':id')
  @Permissions(Permission.FIRMWARE_READ)
  @ApiOperation({ summary: 'Get firmware by ID' })
  @ApiResponse({ status: 200, description: 'Firmware found', type: FirmwareResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Firmware not found' })
  async findOne(@Param('id') id: string): Promise<FirmwareResponseDto> {
    return this.firmwareService.findOne(id);
  }

  @Put(':id')
  @Permissions(Permission.FIRMWARE_WRITE)
  @ApiOperation({ summary: 'Update firmware metadata' })
  @ApiResponse({ status: 200, description: 'Firmware updated', type: FirmwareResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Firmware not found' })
  async update(
    @Param('id') id: string,
    @Body() updateFirmwareDto: UpdateFirmwareDto,
  ): Promise<FirmwareResponseDto> {
    return this.firmwareService.update(id, updateFirmwareDto);
  }

  @Patch(':id/status')
  @Permissions(Permission.FIRMWARE_WRITE)
  @ApiOperation({ summary: 'Update firmware status' })
  @ApiResponse({ status: 200, description: 'Status updated', type: FirmwareResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Firmware not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: FirmwareStatus,
  ): Promise<FirmwareResponseDto> {
    return this.firmwareService.updateStatus(id, status);
  }

  @Delete(':id')
  @Permissions(Permission.FIRMWARE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete firmware' })
  @ApiResponse({ status: 204, description: 'Firmware deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Firmware not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.firmwareService.remove(id);
  }
}
