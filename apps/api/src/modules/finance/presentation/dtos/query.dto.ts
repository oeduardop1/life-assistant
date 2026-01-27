// apps/api/src/modules/finance/presentation/dtos/query.dto.ts

import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IncomeTypeDto } from './income.dto';
import { BillCategoryDto, BillStatusDto } from './bill.dto';
import { ExpenseCategoryDto } from './variable-expense.dto';
import { DebtStatusDto } from './debt.dto';
import { InvestmentTypeDto } from './investment.dto';

// Base query DTO with pagination
export class BaseQueryDto {
  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class IncomeQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ example: '2026-01', description: 'Filter by month (YYYY-MM)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthYear must be in YYYY-MM format' })
  monthYear?: string;

  @ApiPropertyOptional({ enum: IncomeTypeDto })
  @IsOptional()
  @IsEnum(IncomeTypeDto)
  type?: IncomeTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isRecurring?: boolean;
}

export class BillQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ example: '2026-01' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthYear must be in YYYY-MM format' })
  monthYear?: string;

  @ApiPropertyOptional({ enum: BillCategoryDto })
  @IsOptional()
  @IsEnum(BillCategoryDto)
  category?: BillCategoryDto;

  @ApiPropertyOptional({ enum: BillStatusDto })
  @IsOptional()
  @IsEnum(BillStatusDto)
  status?: BillStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isRecurring?: boolean;
}

export class VariableExpenseQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ example: '2026-01' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthYear must be in YYYY-MM format' })
  monthYear?: string;

  @ApiPropertyOptional({ enum: ExpenseCategoryDto })
  @IsOptional()
  @IsEnum(ExpenseCategoryDto)
  category?: ExpenseCategoryDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isRecurring?: boolean;
}

export class DebtQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({
    example: '2026-01',
    description: 'Filter debts visible in this month (YYYY-MM)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthYear must be in YYYY-MM format' })
  monthYear?: string;

  @ApiPropertyOptional({ enum: DebtStatusDto })
  @IsOptional()
  @IsEnum(DebtStatusDto)
  status?: DebtStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isNegotiated?: boolean;
}

export class InvestmentQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: InvestmentTypeDto })
  @IsOptional()
  @IsEnum(InvestmentTypeDto)
  type?: InvestmentTypeDto;
}

export class FinanceSummaryQueryDto {
  @ApiPropertyOptional({
    example: '2026-01',
    description: 'Month to get summary for (defaults to current month)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthYear must be in YYYY-MM format' })
  monthYear?: string;
}
