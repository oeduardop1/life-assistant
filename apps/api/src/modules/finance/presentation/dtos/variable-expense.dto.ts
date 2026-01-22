// apps/api/src/modules/finance/presentation/dtos/variable-expense.dto.ts

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

export enum ExpenseCategoryDto {
  FOOD = 'food',
  TRANSPORT = 'transport',
  HOUSING = 'housing',
  HEALTH = 'health',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  SHOPPING = 'shopping',
  BILLS = 'bills',
  SUBSCRIPTIONS = 'subscriptions',
  TRAVEL = 'travel',
  GIFTS = 'gifts',
  INVESTMENTS = 'investments',
  OTHER = 'other',
}

export class CreateVariableExpenseDto {
  @ApiProperty({ example: 'Alimentação', description: 'Expense name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ExpenseCategoryDto, example: ExpenseCategoryDto.FOOD })
  @IsEnum(ExpenseCategoryDto)
  category: ExpenseCategoryDto;

  @ApiProperty({ example: 800, description: 'Expected/budgeted amount' })
  @IsNumber()
  @Min(0.01)
  expectedAmount: number;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Actual amount spent' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualAmount?: number;

  @ApiPropertyOptional({ default: false, description: 'Is recurring category' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiProperty({ example: '2026-01', description: 'Month/Year (YYYY-MM)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthYear must be in YYYY-MM format' })
  monthYear: string;

  @ApiPropertyOptional({ example: 'BRL', default: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateVariableExpenseDto {
  @ApiPropertyOptional({ example: 'Alimentação' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ExpenseCategoryDto })
  @IsOptional()
  @IsEnum(ExpenseCategoryDto)
  category?: ExpenseCategoryDto;

  @ApiPropertyOptional({ example: 800 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  expectedAmount?: number;

  @ApiPropertyOptional({ example: 650 })
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
