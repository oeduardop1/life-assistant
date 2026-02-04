import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LifeAreaDto, SubAreaDto } from './create-tracking-entry.dto';

/**
 * DTO for creating a custom metric definition
 *
 * @see docs/specs/domains/tracking.md §4.2
 */
export class CreateCustomMetricDto {
  @ApiProperty({
    description: 'Name of the custom metric',
    example: 'Livros Lidos',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the metric',
    example: 'Quantidade de livros lidos no mês',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon for the metric (emoji)',
    example: '📚',
    default: '📊',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Color for the metric (hex)',
    example: '#4CAF50',
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'livros',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit: string;

  @ApiPropertyOptional({
    description: 'Minimum valid value (optional validation)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minValue?: number;

  @ApiPropertyOptional({
    description: 'Maximum valid value (optional validation)',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxValue?: number;

  @ApiPropertyOptional({
    description: 'Life area for categorization',
    enum: LifeAreaDto,
    default: LifeAreaDto.LEARNING,
  })
  @IsOptional()
  @IsEnum(LifeAreaDto)
  area?: LifeAreaDto;

  @ApiPropertyOptional({
    description: 'Sub-area for categorization',
    enum: SubAreaDto,
  })
  @IsOptional()
  @IsEnum(SubAreaDto)
  subArea?: SubAreaDto;
}

/**
 * DTO for updating a custom metric definition
 */
export class UpdateCustomMetricDto {
  @ApiPropertyOptional({
    description: 'Name of the custom metric',
    example: 'Livros Lidos',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the metric',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon for the metric (emoji)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Color for the metric (hex)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiPropertyOptional({
    description: 'Unit of measurement',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({
    description: 'Minimum valid value (set to null to remove)',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minValue?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum valid value (set to null to remove)',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxValue?: number | null;

  @ApiPropertyOptional({
    description: 'Life area for categorization',
    enum: LifeAreaDto,
  })
  @IsOptional()
  @IsEnum(LifeAreaDto)
  area?: LifeAreaDto;

  @ApiPropertyOptional({
    description: 'Sub-area for categorization',
    enum: SubAreaDto,
  })
  @IsOptional()
  @IsEnum(SubAreaDto)
  subArea?: SubAreaDto | null;

  @ApiPropertyOptional({
    description: 'Whether the metric is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Query parameters for listing custom metrics
 */
export class GetCustomMetricsQueryDto {
  @ApiPropertyOptional({
    description: 'Include inactive metrics',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeInactive?: boolean;
}
