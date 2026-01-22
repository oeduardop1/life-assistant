// apps/api/src/modules/finance/presentation/dtos/income.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum IncomeTypeDto {
  SALARY = 'salary',
  FREELANCE = 'freelance',
  BONUS = 'bonus',
  PASSIVE = 'passive',
  INVESTMENT = 'investment',
  GIFT = 'gift',
  OTHER = 'other',
}

export enum IncomeFrequencyDto {
  MONTHLY = 'monthly',
  BIWEEKLY = 'biweekly',
  WEEKLY = 'weekly',
  ANNUAL = 'annual',
  IRREGULAR = 'irregular',
}

export class CreateIncomeDto {
  @ApiProperty({ example: 'Salário', description: 'Income name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: IncomeTypeDto, example: IncomeTypeDto.SALARY })
  @IsEnum(IncomeTypeDto)
  type: IncomeTypeDto;

  @ApiProperty({ enum: IncomeFrequencyDto, example: IncomeFrequencyDto.MONTHLY })
  @IsEnum(IncomeFrequencyDto)
  frequency: IncomeFrequencyDto;

  @ApiProperty({ example: 5000, description: 'Expected amount' })
  @IsNumber()
  @Min(0)
  expectedAmount: number;

  @ApiPropertyOptional({ example: 5000, description: 'Actual amount received' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualAmount?: number;

  @ApiPropertyOptional({ default: true, description: 'Is recurring income' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiProperty({ example: '2026-01', description: 'Month/Year (YYYY-MM)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthYear must be in YYYY-MM format' })
  monthYear: string;

  @ApiPropertyOptional({ example: 'BRL', default: 'BRL', description: 'Currency (ISO 4217)' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateIncomeDto {
  @ApiPropertyOptional({ example: 'Salário' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: IncomeTypeDto })
  @IsOptional()
  @IsEnum(IncomeTypeDto)
  type?: IncomeTypeDto;

  @ApiPropertyOptional({ enum: IncomeFrequencyDto })
  @IsOptional()
  @IsEnum(IncomeFrequencyDto)
  frequency?: IncomeFrequencyDto;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedAmount?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: '2026-01' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthYear must be in YYYY-MM format' })
  monthYear?: string;

  @ApiPropertyOptional({ example: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;
}
