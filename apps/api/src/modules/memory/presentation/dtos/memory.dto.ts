import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import type { KnowledgeItemType, LifeArea } from '@life-assistant/database';

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
// Knowledge Items DTOs
// =============================================================================

export class KnowledgeItemResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ enum: ['fact', 'preference', 'memory', 'insight', 'person'] })
  type!: KnowledgeItemType;

  @ApiPropertyOptional({ enum: ['health', 'career', 'financial', 'relationships', 'personal', 'spiritual'] })
  area?: LifeArea | null;

  @ApiPropertyOptional({ example: 'Fato: Trabalha como desenvolvedor' })
  title?: string | null;

  @ApiProperty({ example: 'Trabalha como desenvolvedor de software na empresa X' })
  content!: string;

  @ApiProperty({ example: 'conversation' })
  source!: string;

  @ApiProperty({ example: 0.9 })
  confidence!: number;

  @ApiProperty({ example: false })
  validatedByUser!: boolean;

  @ApiProperty({ type: [String], example: ['trabalho', 'carreira'] })
  tags!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
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
  @ApiPropertyOptional({ enum: ['fact', 'preference', 'memory', 'insight', 'person'] })
  @IsOptional()
  @IsEnum(['fact', 'preference', 'memory', 'insight', 'person'])
  type?: KnowledgeItemType;

  @ApiPropertyOptional({ enum: ['health', 'career', 'financial', 'relationships', 'personal', 'spiritual'] })
  @IsOptional()
  @IsEnum(['health', 'career', 'financial', 'relationships', 'personal', 'spiritual'])
  area?: LifeArea;

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
}
