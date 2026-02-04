import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  IsNumber,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Habit frequency enum
 */
export enum HabitFrequencyDto {
  DAILY = 'daily',
  WEEKDAYS = 'weekdays',
  WEEKENDS = 'weekends',
  CUSTOM = 'custom',
}

/**
 * Period of day enum
 */
export enum PeriodOfDayDto {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  ANYTIME = 'anytime',
}

/**
 * DTO for creating a habit
 *
 * @see docs/specs/domains/tracking.md §5.1
 */
export class CreateHabitDto {
  @ApiProperty({
    description: 'Name of the habit',
    example: 'Treino',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the habit',
    example: 'Treinar na academia ou em casa',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon for the habit (emoji or icon name)',
    example: '🏋️',
    default: '✓',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Color for the habit (hex)',
    example: '#4CAF50',
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiPropertyOptional({
    description: 'Frequency of the habit',
    enum: HabitFrequencyDto,
    default: HabitFrequencyDto.DAILY,
  })
  @IsOptional()
  @IsEnum(HabitFrequencyDto)
  frequency?: HabitFrequencyDto;

  @ApiPropertyOptional({
    description: 'Days of week for custom frequency (0=Sunday, 6=Saturday)',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @ArrayMaxSize(7)
  frequencyDays?: number[];

  @ApiPropertyOptional({
    description: 'Period of day for the habit',
    enum: PeriodOfDayDto,
    default: PeriodOfDayDto.ANYTIME,
  })
  @IsOptional()
  @IsEnum(PeriodOfDayDto)
  periodOfDay?: PeriodOfDayDto;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;
}

/**
 * DTO for updating a habit
 */
export class UpdateHabitDto {
  @ApiPropertyOptional({
    description: 'Name of the habit',
    example: 'Treino',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the habit',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon for the habit',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Color for the habit (hex)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiPropertyOptional({
    description: 'Frequency of the habit',
    enum: HabitFrequencyDto,
  })
  @IsOptional()
  @IsEnum(HabitFrequencyDto)
  frequency?: HabitFrequencyDto;

  @ApiPropertyOptional({
    description: 'Days of week for custom frequency',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @ArrayMaxSize(7)
  frequencyDays?: number[];

  @ApiPropertyOptional({
    description: 'Period of day for the habit',
    enum: PeriodOfDayDto,
  })
  @IsOptional()
  @IsEnum(PeriodOfDayDto)
  periodOfDay?: PeriodOfDayDto;

  @ApiPropertyOptional({
    description: 'Sort order for display',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the habit is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for completing a habit
 */
export class CompleteHabitDto {
  @ApiPropertyOptional({
    description: 'Date of completion (YYYY-MM-DD). Defaults to today.',
    example: '2026-02-02',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Optional notes about the completion',
    example: 'Treino de peito e tríceps',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for uncompleting a habit
 */
export class UncompleteHabitDto {
  @ApiProperty({
    description: 'Date to remove completion (YYYY-MM-DD)',
    example: '2026-02-02',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;
}

/**
 * Query parameters for listing habits
 */
export class GetHabitsQueryDto {
  @ApiPropertyOptional({
    description: 'Include inactive habits',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeInactive?: boolean;
}

/**
 * Query parameters for habit completions with stats
 *
 * @see docs/specs/domains/tracking.md §5.4 for API spec
 */
export class GetHabitCompletionsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD). Defaults to 84 days ago (12 weeks).',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD). Defaults to today.',
    example: '2026-02-04',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
