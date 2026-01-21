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
import { TrackingService } from '../../application/services/tracking.service';
import { CurrentUser } from '../../../../common/decorators';
import type { AuthenticatedUser } from '../../../../common/types/request.types';
import {
  CreateTrackingEntryDto,
  UpdateTrackingEntryDto,
  GetTrackingEntriesQueryDto,
  GetAggregationsQueryDto,
} from '../dtos/create-tracking-entry.dto';

/**
 * Controller for tracking entries CRUD operations
 *
 * @see docs/specs/data-model.md §4.3 for tracking_entries entity
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
@ApiTags('Tracking')
@ApiBearerAuth()
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  /**
   * Create a new tracking entry (manual form submission)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a tracking entry' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Entry created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTrackingEntryDto
  ) {
    const entry = await this.trackingService.recordMetric(user.id, {
      type: dto.type,
      area: dto.area,
      subArea: dto.subArea,
      value: dto.value,
      unit: dto.unit,
      entryDate: dto.entryDate,
      entryTime: dto.entryTime,
      source: dto.source ?? 'form',
      metadata: dto.metadata,
    });

    return { entry };
  }

  /**
   * Get tracking entries with filters
   */
  @Get()
  @ApiOperation({ summary: 'List tracking entries' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Entries retrieved successfully' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetTrackingEntriesQueryDto
  ) {
    const result = await this.trackingService.getHistory(user.id, {
      type: query.type as string | undefined,
      area: query.area as string | undefined,
      subArea: query.subArea as string | undefined,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      entries: result.entries,
      total: result.total,
      hasMore: result.hasMore,
    };
  }

  /**
   * Get aggregations for a tracking type
   */
  @Get('aggregations')
  @ApiOperation({ summary: 'Get aggregations for a tracking type' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Aggregations retrieved successfully' })
  async getAggregations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetAggregationsQueryDto
  ) {
    const aggregation = await this.trackingService.getAggregations(
      user.id,
      query.type as string,
      query.startDate,
      query.endDate
    );

    return { aggregation };
  }

  /**
   * Get tracking statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get tracking statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stats retrieved successfully' })
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    const stats = await this.trackingService.getStats(user.id);
    return { stats };
  }

  /**
   * Get a single tracking entry
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a tracking entry by ID' })
  @ApiParam({ name: 'id', description: 'Entry ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Entry retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Entry not found' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const entry = await this.trackingService.getEntry(user.id, id);
    if (!entry) {
      throw new NotFoundException('Tracking entry not found');
    }
    return { entry };
  }

  /**
   * Update a tracking entry
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a tracking entry' })
  @ApiParam({ name: 'id', description: 'Entry ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Entry updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Entry not found' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTrackingEntryDto
  ) {
    const entry = await this.trackingService.updateEntry(user.id, id, {
      value: dto.value,
      unit: dto.unit,
      entryDate: dto.entryDate,
      entryTime: dto.entryTime,
      metadata: dto.metadata,
    });

    if (!entry) {
      throw new NotFoundException('Tracking entry not found');
    }

    return { entry };
  }

  /**
   * Delete a tracking entry
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tracking entry' })
  @ApiParam({ name: 'id', description: 'Entry ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Entry deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Entry not found' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const deleted = await this.trackingService.deleteEntry(user.id, id);
    if (!deleted) {
      throw new NotFoundException('Tracking entry not found');
    }
  }
}
