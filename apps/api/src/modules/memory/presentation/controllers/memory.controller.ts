import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
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
} from '@nestjs/swagger';
import { CurrentUser } from '../../../../common/decorators';
import { UserMemoryService } from '../../application/services/user-memory.service';
import { KnowledgeItemsService } from '../../application/services/knowledge-items.service';
import {
  UserMemoryResponseDto,
  KnowledgeItemResponseDto,
  KnowledgeItemListResponseDto,
  ListKnowledgeItemsQueryDto,
} from '../dtos';
import type { UserMemory, KnowledgeItem } from '@life-assistant/database';

/**
 * Memory controller - REST endpoints for user memory management
 *
 * @see MILESTONES.md M1.3 for implementation details
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

  /**
   * Get user memory for the authenticated user
   */
  @Get()
  @ApiOperation({ summary: 'Get user memory' })
  @ApiResponse({
    status: 200,
    description: 'User memory',
    type: UserMemoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getUserMemory(
    @CurrentUser('id') userId: string
  ): Promise<UserMemoryResponseDto> {
    const memory = await this.userMemoryService.getOrCreate(userId);
    return this.mapUserMemory(memory);
  }

  /**
   * List knowledge items for the authenticated user
   */
  @Get('knowledge')
  @ApiOperation({ summary: 'List knowledge items' })
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
    if (query.limit !== undefined) options.limit = query.limit;
    if (query.offset !== undefined) options.offset = query.offset;

    const result = await this.knowledgeItemsService.list(userId, options);

    return {
      items: result.items.map((item) => this.mapKnowledgeItem(item)),
      total: result.total,
      hasMore: result.hasMore,
    };
  }

  /**
   * Get a specific knowledge item
   */
  @Get('knowledge/:id')
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
   * Delete (soft delete) a knowledge item
   */
  @Delete('knowledge/:id')
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
      christianPerspective: memory.christianPerspective ?? false,
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
      confidence: item.confidence,
      validatedByUser: item.validatedByUser ?? false,
      tags,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
