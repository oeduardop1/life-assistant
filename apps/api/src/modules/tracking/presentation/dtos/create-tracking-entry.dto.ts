import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Tracking types for M2.1
 * @see ADR-015 for Low Friction Tracking Philosophy
 * @see docs/specs/system.md §3.3 for validation rules
 */
export enum TrackingTypeM21 {
  WEIGHT = 'weight',
  WATER = 'water',
  SLEEP = 'sleep',
  EXERCISE = 'exercise',
  MOOD = 'mood',
  ENERGY = 'energy',
  CUSTOM = 'custom',
}

/**
 * Life areas enum
 */
export enum LifeAreaDto {
  HEALTH = 'health',
  FINANCIAL = 'financial',
  RELATIONSHIPS = 'relationships',
  CAREER = 'career',
  PERSONAL_GROWTH = 'personal_growth',
  LEISURE = 'leisure',
  SPIRITUALITY = 'spirituality',
  MENTAL_HEALTH = 'mental_health',
}

/**
 * Exercise intensity enum
 */
export enum ExerciseIntensity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Metadata for sleep tracking
 */
export class SleepMetadata {
  @ApiPropertyOptional({
    description: 'Sleep quality (1-10)',
    minimum: 1,
    maximum: 10,
    example: 7,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  quality?: number;

  @ApiPropertyOptional({
    description: 'Bedtime in ISO format',
    example: '2026-01-19T22:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  bedtime?: string;

  @ApiPropertyOptional({
    description: 'Wake time in ISO format',
    example: '2026-01-20T06:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  waketime?: string;
}

/**
 * Metadata for exercise tracking
 */
export class ExerciseMetadata {
  @ApiPropertyOptional({
    description: 'Exercise intensity',
    enum: ExerciseIntensity,
    example: ExerciseIntensity.MEDIUM,
  })
  @IsOptional()
  @IsEnum(ExerciseIntensity)
  intensity?: ExerciseIntensity;

  @ApiPropertyOptional({
    description: 'Type of exercise',
    example: 'running',
  })
  @IsOptional()
  @IsString()
  exerciseType?: string;

  @ApiPropertyOptional({
    description: 'Distance in meters',
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;

  @ApiPropertyOptional({
    description: 'Calories burned',
    example: 350,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;
}

/**
 * Metadata for mood/energy tracking
 */
export class MoodEnergyMetadata {
  @ApiPropertyOptional({
    description: 'Notes about the mood/energy level',
    example: 'Feeling great after a good sleep',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for creating a tracking entry
 *
 * @see docs/specs/system.md §3.3 for validation rules
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
export class CreateTrackingEntryDto {
  @ApiProperty({
    description: 'Type of tracking entry',
    enum: TrackingTypeM21,
    example: TrackingTypeM21.WEIGHT,
  })
  @IsEnum(TrackingTypeM21)
  @IsNotEmpty()
  type: TrackingTypeM21;

  @ApiProperty({
    description: 'Life area associated with this entry',
    enum: LifeAreaDto,
    example: LifeAreaDto.HEALTH,
  })
  @IsEnum(LifeAreaDto)
  @IsNotEmpty()
  area: LifeAreaDto;

  @ApiProperty({
    description: 'Value of the metric',
    example: 75.5,
  })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement (kg, ml, hours, minutes, etc.)',
    example: 'kg',
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({
    description: 'Date of the entry (YYYY-MM-DD)',
    example: '2026-01-19',
  })
  @IsDateString()
  @IsNotEmpty()
  entryDate: string;

  @ApiPropertyOptional({
    description: 'Time of the entry in ISO format',
    example: '2026-01-19T08:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  entryTime?: string;

  @ApiPropertyOptional({
    description: 'Source of the entry (form, chat, api, telegram)',
    example: 'chat',
    default: 'form',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata specific to the tracking type',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for updating a tracking entry
 */
export class UpdateTrackingEntryDto {
  @ApiPropertyOptional({
    description: 'Value of the metric',
    example: 75.5,
  })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement',
    example: 'kg',
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    description: 'Date of the entry (YYYY-MM-DD)',
    example: '2026-01-19',
  })
  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @ApiPropertyOptional({
    description: 'Time of the entry in ISO format',
  })
  @IsOptional()
  @IsDateString()
  entryTime?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Query parameters for listing tracking entries
 */
export class GetTrackingEntriesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by tracking type',
    enum: TrackingTypeM21,
  })
  @IsOptional()
  @IsEnum(TrackingTypeM21)
  type?: TrackingTypeM21;

  @ApiPropertyOptional({
    description: 'Filter by life area',
    enum: LifeAreaDto,
  })
  @IsOptional()
  @IsEnum(LifeAreaDto)
  area?: LifeAreaDto;

  @ApiPropertyOptional({
    description: 'Start date for filtering (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (YYYY-MM-DD)',
    example: '2026-01-19',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of entries to return',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of entries to skip',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  offset?: number;
}

/**
 * Query parameters for getting aggregations
 */
export class GetAggregationsQueryDto {
  @ApiProperty({
    description: 'Tracking type to aggregate',
    enum: TrackingTypeM21,
  })
  @IsEnum(TrackingTypeM21)
  @IsNotEmpty()
  type: TrackingTypeM21;

  @ApiPropertyOptional({
    description: 'Start date for aggregation (YYYY-MM-DD)',
    example: '2026-01-12',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for aggregation (YYYY-MM-DD)',
    example: '2026-01-19',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
