import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsString,
  IsNumber,
  IsArray,
  IsNotEmpty,
  MaxLength,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import type {
  KnowledgeItemType,
  KnowledgeItemSource,
  LifeArea,
} from '@life-assistant/database';

// =============================================================================
// Enum Arrays for Validation (must match database enums)
// =============================================================================

const KNOWLEDGE_ITEM_TYPES = [
  'fact',
  'preference',
  'memory',
  'insight',
  'person',
] as const;

const KNOWLEDGE_ITEM_SOURCES = [
  'conversation',
  'user_input',
  'ai_inference',
  'onboarding',
] as const;

const LIFE_AREAS = [
  'health',
  'financial',
  'relationships',
  'career',
  'personal_growth',
  'leisure',
  'spirituality',
  'mental_health',
] as const;

// =============================================================================
// Memory Stats DTOs
// =============================================================================

export class MemoryStatsDto {
  @ApiProperty({
    description: 'Count of items by life area',
    example: {
      health: 12,
      financial: 8,
      relationships: 5,
      career: 10,
      personal_growth: 3,
      leisure: 2,
      spirituality: 1,
      mental_health: 4,
    },
  })
  byArea!: Record<LifeArea, number>;

  @ApiProperty({
    description: 'Count of items by type',
    example: { fact: 20, preference: 10, memory: 5, insight: 8, person: 2 },
  })
  byType!: Record<KnowledgeItemType, number>;

  @ApiProperty({ description: 'Total number of knowledge items', example: 45 })
  total!: number;
}

// =============================================================================
// User Memory DTOs
// =============================================================================

export class UserMemoryResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId!: string;

  @ApiPropertyOptional({ example: 'João, 32 anos, desenvolvedor de software' })
  bio?: string | null;

  @ApiPropertyOptional({ example: 'Desenvolvedor de Software' })
  occupation?: string | null;

  @ApiPropertyOptional({ example: 'Casado, 2 filhos' })
  familyContext?: string | null;

  @ApiProperty({ type: [String], example: ['Perder 10kg', 'Aprender inglês'] })
  currentGoals!: string[];

  @ApiProperty({ type: [String], example: ['Procrastinação', 'Ansiedade'] })
  currentChallenges!: string[];

  @ApiProperty({ type: [String], example: ['Entrevista amanhã', 'Projeto X'] })
  topOfMind!: string[];

  @ApiProperty({ type: [String], example: ['Família', 'Saúde', 'Crescimento'] })
  values!: string[];

  @ApiPropertyOptional({ example: 'direto' })
  communicationStyle?: string | null;

  @ApiPropertyOptional({ example: 'Prefere feedback construtivo' })
  feedbackPreferences?: string | null;

  @ApiProperty({ example: false })
  christianPerspective!: boolean;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiPropertyOptional()
  lastConsolidatedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

// =============================================================================
// Memory Overview Response (User Memory + Stats)
// =============================================================================

export class MemoryOverviewResponseDto {
  @ApiProperty({ type: UserMemoryResponseDto })
  userMemory!: UserMemoryResponseDto;

  @ApiProperty({ type: MemoryStatsDto })
  stats!: MemoryStatsDto;
}

// =============================================================================
// Knowledge Items DTOs
// =============================================================================

export class KnowledgeItemResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ enum: KNOWLEDGE_ITEM_TYPES })
  type!: KnowledgeItemType;

  @ApiPropertyOptional({ enum: LIFE_AREAS })
  area?: LifeArea | null;

  @ApiPropertyOptional({ example: 'Fato: Trabalha como desenvolvedor' })
  title?: string | null;

  @ApiProperty({
    example: 'Trabalha como desenvolvedor de software na empresa X',
  })
  content!: string;

  @ApiProperty({ enum: KNOWLEDGE_ITEM_SOURCES, example: 'conversation' })
  source!: KnowledgeItemSource;

  @ApiPropertyOptional({
    description: 'Reference to source (e.g., conversation ID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sourceRef?: string | null;

  @ApiProperty({ example: 0.9, minimum: 0, maximum: 1 })
  confidence!: number;

  @ApiProperty({ example: false })
  validatedByUser!: boolean;

  @ApiProperty({ type: [String], example: ['trabalho', 'carreira'] })
  tags!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  // Temporal tracking (M1.6.1)
  @ApiPropertyOptional({
    description: 'ID of the item that superseded this one',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  supersededById?: string | null;

  @ApiPropertyOptional({
    description: 'When this item was superseded',
  })
  supersededAt?: Date | null;
}

export class KnowledgeItemListResponseDto {
  @ApiProperty({ type: [KnowledgeItemResponseDto] })
  items!: KnowledgeItemResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: true })
  hasMore!: boolean;
}

// =============================================================================
// Query DTOs
// =============================================================================

export class ListKnowledgeItemsQueryDto {
  @ApiPropertyOptional({ enum: KNOWLEDGE_ITEM_TYPES })
  @IsOptional()
  @IsEnum(KNOWLEDGE_ITEM_TYPES)
  type?: KnowledgeItemType;

  @ApiPropertyOptional({ enum: LIFE_AREAS })
  @IsOptional()
  @IsEnum(LIFE_AREAS)
  area?: LifeArea;

  @ApiPropertyOptional({ enum: KNOWLEDGE_ITEM_SOURCES })
  @IsOptional()
  @IsEnum(KNOWLEDGE_ITEM_SOURCES)
  source?: KnowledgeItemSource;

  @ApiPropertyOptional({
    description: 'Minimum confidence (0-1). Low < 0.6, Medium 0.6-0.79, High >= 0.8',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  confidenceMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum confidence (0-1)',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  confidenceMax?: number;

  @ApiPropertyOptional({ description: 'Search text in title and content' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter items created after this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter items created before this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  // Temporal filter (M1.6.1)
  @ApiPropertyOptional({
    description: 'Include superseded (historical) items in results',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSuperseded?: boolean;
}

// =============================================================================
// Create Knowledge Item DTO
// =============================================================================

export class CreateKnowledgeItemDto {
  @ApiProperty({
    enum: KNOWLEDGE_ITEM_TYPES,
    description: 'Type of knowledge item',
  })
  @IsNotEmpty()
  @IsEnum(KNOWLEDGE_ITEM_TYPES)
  type!: KnowledgeItemType;

  @ApiProperty({
    description: 'Content of the knowledge item',
    example: 'Prefere café sem açúcar',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({ enum: LIFE_AREAS, description: 'Life area category' })
  @IsOptional()
  @IsEnum(LIFE_AREAS)
  area?: LifeArea;

  @ApiPropertyOptional({
    description: 'Optional title for the item',
    example: 'Preferência de café',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Tags for categorization',
    example: ['alimentação', 'preferência'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// =============================================================================
// Update Knowledge Item DTO
// =============================================================================

export class UpdateKnowledgeItemDto {
  @ApiPropertyOptional({
    description: 'Updated title',
    example: 'Preferência de café atualizada',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated content',
    example: 'Prefere café com leite sem açúcar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Updated tags',
    example: ['alimentação', 'café'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// =============================================================================
// Validate Response DTO
// =============================================================================

export class ValidateKnowledgeItemResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 1.0 })
  confidence!: number;

  @ApiProperty({ example: true })
  validatedByUser!: boolean;
}

// =============================================================================
// Export DTOs (M1.6.1)
// =============================================================================

export class ExportMemoryStatsDto {
  @ApiProperty({ example: 40, description: 'Number of active (non-superseded) items' })
  active!: number;

  @ApiProperty({ example: 5, description: 'Number of superseded (historical) items' })
  superseded!: number;
}

export class ExportMemoryResponseDto {
  @ApiProperty({ type: [KnowledgeItemResponseDto] })
  items!: KnowledgeItemResponseDto[];

  @ApiProperty({ example: 45 })
  total!: number;

  @ApiProperty({ example: '2026-01-14T12:00:00.000Z' })
  exportedAt!: string;

  @ApiProperty({ type: ExportMemoryStatsDto, description: 'Temporal statistics' })
  stats!: ExportMemoryStatsDto;
}
