import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CustomMetricService } from '../../application/services/custom-metric.service';
import { CurrentUser } from '../../../../common/decorators';
import type { AuthenticatedUser } from '../../../../common/types/request.types';
import {
  CreateCustomMetricDto,
  UpdateCustomMetricDto,
  GetCustomMetricsQueryDto,
} from '../dtos/custom-metric.dto';
import type { LifeArea, SubArea } from '@life-assistant/database';

/**
 * Controller for custom metric definition CRUD operations
 *
 * @see docs/specs/domains/tracking.md §4.2 for API spec
 */
@ApiTags('Custom Metrics')
@ApiBearerAuth()
@Controller('tracking/custom-metrics')
export class CustomMetricController {
  constructor(private readonly customMetricService: CustomMetricService) {}

  /**
   * Create a new custom metric definition
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom metric definition' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Custom metric created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Metric with same name exists' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCustomMetricDto) {
    const metric = await this.customMetricService.create(user.id, {
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      color: dto.color,
      unit: dto.unit,
      minValue: dto.minValue,
      maxValue: dto.maxValue,
      area: dto.area as LifeArea | undefined,
      subArea: dto.subArea as SubArea | undefined,
    });

    return { metric };
  }

  /**
   * Get all custom metric definitions for the current user
   */
  @Get()
  @ApiOperation({ summary: 'List custom metric definitions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Metrics retrieved successfully' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: GetCustomMetricsQueryDto) {
    const metrics = await this.customMetricService.findAll(user.id, query.includeInactive);
    return { metrics };
  }

  /**
   * Get a custom metric definition by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a custom metric by ID' })
  @ApiParam({ name: 'id', description: 'Custom metric ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Metric retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Metric not found' })
  async getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const metric = await this.customMetricService.findById(user.id, id);
    if (!metric) {
      throw new NotFoundException('Métrica personalizada não encontrada');
    }
    return { metric };
  }

  /**
   * Update a custom metric definition
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom metric' })
  @ApiParam({ name: 'id', description: 'Custom metric ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Metric updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Metric not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Metric with same name exists' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomMetricDto
  ) {
    const metric = await this.customMetricService.update(user.id, id, {
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      color: dto.color,
      unit: dto.unit,
      minValue: dto.minValue,
      maxValue: dto.maxValue,
      area: dto.area as LifeArea | undefined,
      subArea: dto.subArea as SubArea | null | undefined,
      isActive: dto.isActive,
    });

    if (!metric) {
      throw new NotFoundException('Métrica personalizada não encontrada');
    }

    return { metric };
  }

  /**
   * Delete a custom metric definition (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom metric (soft delete)' })
  @ApiParam({ name: 'id', description: 'Custom metric ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Metric deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Metric not found' })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const deleted = await this.customMetricService.delete(user.id, id);
    if (!deleted) {
      throw new NotFoundException('Métrica personalizada não encontrada');
    }
  }
}
