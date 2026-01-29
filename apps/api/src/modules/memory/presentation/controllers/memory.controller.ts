import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../../common/decorators';
import { UserMemoryService } from '../../application/services/user-memory.service';
import { KnowledgeItemsService } from '../../application/services/knowledge-items.service';
import {
  UserMemoryResponseDto,
  MemoryOverviewResponseDto,
  MemoryStatsDto,
  KnowledgeItemResponseDto,
  KnowledgeItemListResponseDto,
  ListKnowledgeItemsQueryDto,
  CreateKnowledgeItemDto,
  UpdateKnowledgeItemDto,
  ValidateKnowledgeItemResponseDto,
  ExportMemoryResponseDto,
} from '../dtos';
import type { UserMemory, KnowledgeItem } from '@life-assistant/database';

/**
 * Memory controller - REST endpoints for user memory management
 *
 * @see docs/milestones/phase-1-counselor.md M1.6 for Memory View implementation
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 */
@ApiTags('memory')
@Controller('memory')
@ApiBearerAuth()
export class MemoryController {
  constructor(
    private readonly userMemoryService: UserMemoryService,
    private readonly knowledgeItemsService: KnowledgeItemsService
  ) {}

  // ==========================================================================
  // Memory Overview
  // ==========================================================================

  /**
   * Get memory overview for the authenticated user (profile + stats)
   */
  @Get()
  @ApiOperation({ summary: 'Get memory overview (profile + stats)' })
  @ApiResponse({
    status: 200,
    description: 'Memory overview with user profile and statistics',
    type: MemoryOverviewResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getMemoryOverview(
    @CurrentUser('id') userId: string
  ): Promise<MemoryOverviewResponseDto> {
    const [memory, stats] = await Promise.all([
      this.userMemoryService.getOrCreate(userId),
      this.knowledgeItemsService.getStats(userId),
    ]);

    return {
      userMemory: this.mapUserMemory(memory),
      stats: stats as MemoryStatsDto,
    };
  }

  // ==========================================================================
  // Knowledge Items CRUD
  // ==========================================================================

  /**
   * List knowledge items for the authenticated user
   */
  @Get('items')
  @ApiOperation({ summary: 'List knowledge items with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of knowledge items',
    type: KnowledgeItemListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async listKnowledgeItems(
    @CurrentUser('id') userId: string,
    @Query() query: ListKnowledgeItemsQueryDto
  ): Promise<KnowledgeItemListResponseDto> {
    // Build options without undefined values (exactOptionalPropertyTypes)
    const options: Parameters<typeof this.knowledgeItemsService.list>[1] = {};
    if (query.type !== undefined) options.type = query.type;
    if (query.area !== undefined) options.area = query.area;
    if (query.source !== undefined) options.source = query.source;
    if (query.confidenceMin !== undefined) options.confidenceMin = query.confidenceMin;
    if (query.confidenceMax !== undefined) options.confidenceMax = query.confidenceMax;
    if (query.search !== undefined) options.search = query.search;
    if (query.dateFrom !== undefined) options.dateFrom = new Date(query.dateFrom);
    if (query.dateTo !== undefined) options.dateTo = new Date(query.dateTo);
    if (query.limit !== undefined) options.limit = query.limit;
    if (query.offset !== undefined) options.offset = query.offset;
    if (query.includeSuperseded !== undefined) options.includeSuperseded = query.includeSuperseded;

    const result = await this.knowledgeItemsService.list(userId, options);

    return {
      items: result.items.map((item) => this.mapKnowledgeItem(item)),
      total: result.total,
      hasMore: result.hasMore,
    };
  }

  /**
   * Create a new knowledge item manually
   */
  @Post('items')
  @ApiOperation({ summary: 'Create a knowledge item manually' })
  @ApiBody({ type: CreateKnowledgeItemDto })
  @ApiResponse({
    status: 201,
    description: 'Knowledge item created',
    type: KnowledgeItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async createKnowledgeItem(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateKnowledgeItemDto
  ): Promise<KnowledgeItemResponseDto> {
    // Build params without undefined values (exactOptionalPropertyTypes)
    const params: Parameters<typeof this.knowledgeItemsService.add>[1] = {
      type: dto.type,
      content: dto.content,
      source: 'user_input',
      confidence: 1.0, // User-created items have full confidence
    };
    if (dto.area !== undefined) params.area = dto.area;
    if (dto.title !== undefined) params.title = dto.title;
    if (dto.tags !== undefined) params.tags = dto.tags;

    const { item } = await this.knowledgeItemsService.add(userId, params);

    return this.mapKnowledgeItem(item);
  }

  /**
   * Get a specific knowledge item
   */
  @Get('items/:id')
  @ApiOperation({ summary: 'Get knowledge item details' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Knowledge item details',
    type: KnowledgeItemResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Knowledge item not found' })
  async getKnowledgeItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) itemId: string
  ): Promise<KnowledgeItemResponseDto> {
    const item = await this.knowledgeItemsService.findById(userId, itemId);

    if (!item) {
      throw new NotFoundException('Item de conhecimento não encontrado');
    }

    return this.mapKnowledgeItem(item);
  }

  /**
   * Update a knowledge item (title, content, tags)
   */
  @Patch('items/:id')
  @ApiOperation({ summary: 'Update a knowledge item' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateKnowledgeItemDto })
  @ApiResponse({
    status: 200,
    description: 'Knowledge item updated',
    type: KnowledgeItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Knowledge item not found' })
  async updateKnowledgeItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateKnowledgeItemDto
  ): Promise<KnowledgeItemResponseDto> {
    // Build params without undefined values (exactOptionalPropertyTypes)
    const params: Parameters<typeof this.knowledgeItemsService.update>[2] = {};
    if (dto.title !== undefined) params.title = dto.title;
    if (dto.content !== undefined) params.content = dto.content;
    if (dto.tags !== undefined) params.tags = dto.tags;

    const item = await this.knowledgeItemsService.update(userId, itemId, params);

    if (!item) {
      throw new NotFoundException('Item de conhecimento não encontrado');
    }

    return this.mapKnowledgeItem(item);
  }

  /**
   * Delete (soft delete) a knowledge item
   */
  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a knowledge item (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Knowledge item deleted' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Knowledge item not found' })
  async deleteKnowledgeItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) itemId: string
  ): Promise<void> {
    const deleted = await this.knowledgeItemsService.delete(userId, itemId);

    if (!deleted) {
      throw new NotFoundException('Item de conhecimento não encontrado');
    }
  }

  /**
   * Validate a knowledge item (mark as validated by user)
   */
  @Post('items/:id/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a knowledge item (sets confidence to 1.0)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Knowledge item validated',
    type: ValidateKnowledgeItemResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Knowledge item not found' })
  async validateKnowledgeItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) itemId: string
  ): Promise<ValidateKnowledgeItemResponseDto> {
    const item = await this.knowledgeItemsService.validate(userId, itemId);

    if (!item) {
      throw new NotFoundException('Item de conhecimento não encontrado');
    }

    return {
      success: true,
      id: item.id,
      confidence: item.confidence,
      validatedByUser: item.validatedByUser ?? true,
    };
  }

  // ==========================================================================
  // Export
  // ==========================================================================

  /**
   * Export all knowledge items for the authenticated user (M1.6.1)
   * Includes all items (active and superseded) with temporal metadata.
   */
  @Get('export')
  @ApiOperation({ summary: 'Export all knowledge items as JSON (includes history)' })
  @ApiResponse({
    status: 200,
    description: 'All knowledge items exported with temporal metadata',
    type: ExportMemoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async exportMemory(
    @CurrentUser('id') userId: string
  ): Promise<ExportMemoryResponseDto> {
    const result = await this.knowledgeItemsService.exportAll(userId);

    return {
      items: result.items.map((item) => this.mapKnowledgeItem(item)),
      total: result.total,
      exportedAt: result.exportedAt,
      stats: result.stats,
    };
  }

  // ==========================================================================
  // Private Mappers
  // ==========================================================================

  /**
   * Map UserMemory entity to response DTO
   */
  private mapUserMemory(memory: UserMemory): UserMemoryResponseDto {
    // JSONB arrays - use type annotation in map callbacks since schema is unknown at runtime
    const currentGoals = Array.isArray(memory.currentGoals) ? memory.currentGoals : [];
    const currentChallenges = Array.isArray(memory.currentChallenges) ? memory.currentChallenges : [];
    const topOfMind = Array.isArray(memory.topOfMind) ? memory.topOfMind : [];
    const values = Array.isArray(memory.values) ? memory.values : [];

    return {
      id: memory.id,
      userId: memory.userId,
      bio: memory.bio,
      occupation: memory.occupation,
      familyContext: memory.familyContext,
      currentGoals,
      currentChallenges,
      topOfMind,
      values,
      communicationStyle: memory.communicationStyle,
      feedbackPreferences: memory.feedbackPreferences,
      version: memory.version,
      lastConsolidatedAt: memory.lastConsolidatedAt,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
    };
  }

  /**
   * Map KnowledgeItem entity to response DTO
   */
  private mapKnowledgeItem(item: KnowledgeItem): KnowledgeItemResponseDto {
    // JSONB array - use String() since runtime type is unknown
    const tags = Array.isArray(item.tags) ? item.tags : [];

    return {
      id: item.id,
      type: item.type,
      area: item.area,
      title: item.title,
      content: item.content,
      source: item.source,
      sourceRef: item.sourceRef,
      confidence: item.confidence,
      validatedByUser: item.validatedByUser ?? false,
      tags,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      // Temporal fields (M1.6.1)
      supersededById: item.supersededById,
      supersededAt: item.supersededAt,
    };
  }
}
