// apps/api/src/modules/finance/presentation/dtos/bill.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BillCategoryDto {
  HOUSING = 'housing',
  UTILITIES = 'utilities',
  SUBSCRIPTION = 'subscription',
  INSURANCE = 'insurance',
  OTHER = 'other',
}

export enum BillStatusDto {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELED = 'canceled',
}

export class CreateBillDto {
  @ApiProperty({ example: 'Aluguel', description: 'Bill name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: BillCategoryDto, example: BillCategoryDto.HOUSING })
  @IsEnum(BillCategoryDto)
  category: BillCategoryDto;

  @ApiProperty({ example: 1500, description: 'Bill amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 10, description: 'Due day of month (1-31)' })
  @IsNumber()
  @Min(1)
  @Max(31)
  dueDay: number;

  @ApiPropertyOptional({ default: true, description: 'Is recurring bill' })
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

export class UpdateBillDto {
  @ApiPropertyOptional({ example: 'Aluguel' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: BillCategoryDto })
  @IsOptional()
  @IsEnum(BillCategoryDto)
  category?: BillCategoryDto;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dueDay?: number;

  @ApiPropertyOptional({ enum: BillStatusDto })
  @IsOptional()
  @IsEnum(BillStatusDto)
  status?: BillStatusDto;

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
