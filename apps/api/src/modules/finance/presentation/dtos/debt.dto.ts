// apps/api/src/modules/finance/presentation/dtos/debt.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DebtStatusDto {
  ACTIVE = 'active',
  OVERDUE = 'overdue',
  PAID_OFF = 'paid_off',
  SETTLED = 'settled',
  DEFAULTED = 'defaulted',
}

export class CreateDebtDto {
  @ApiProperty({ example: 'Financiamento Carro', description: 'Debt name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Banco XYZ', description: 'Creditor name' })
  @IsOptional()
  @IsString()
  creditor?: string;

  @ApiProperty({ example: 50000, description: 'Total debt amount' })
  @IsNumber()
  @Min(0.01)
  totalAmount: number;

  @ApiPropertyOptional({
    default: true,
    description: 'Is debt negotiated with installments',
  })
  @IsOptional()
  @IsBoolean()
  isNegotiated?: boolean;

  @ApiPropertyOptional({
    example: 48,
    description: 'Total number of installments (required if negotiated)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalInstallments?: number;

  @ApiPropertyOptional({
    example: 1200,
    description: 'Monthly installment amount (required if negotiated)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  installmentAmount?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Due day of month (1-31, required if negotiated)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dueDay?: number;

  @ApiPropertyOptional({
    example: '2026-01',
    description: 'Start month for installments (YYYY-MM, required if negotiated)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'startMonthYear must be in YYYY-MM format',
  })
  startMonthYear?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'BRL', default: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateDebtDto {
  @ApiPropertyOptional({ example: 'Financiamento Carro' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Banco XYZ' })
  @IsOptional()
  @IsString()
  creditor?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  totalAmount?: number;

  @ApiPropertyOptional({ enum: DebtStatusDto })
  @IsOptional()
  @IsEnum(DebtStatusDto)
  status?: DebtStatusDto;

  @ApiPropertyOptional({
    example: '2026-01',
    description: 'Start month for installments (YYYY-MM)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'startMonthYear must be in YYYY-MM format',
  })
  startMonthYear?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class NegotiateDebtDto {
  @ApiProperty({ example: 48, description: 'Total number of installments' })
  @IsNumber()
  @Min(1)
  totalInstallments: number;

  @ApiProperty({ example: 1200, description: 'Monthly installment amount' })
  @IsNumber()
  @Min(0.01)
  installmentAmount: number;

  @ApiProperty({ example: 15, description: 'Due day of month (1-31)' })
  @IsNumber()
  @Min(1)
  @Max(31)
  dueDay: number;

  @ApiPropertyOptional({
    example: '2026-01',
    description: 'Start month for installments (YYYY-MM, defaults to current month)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'startMonthYear must be in YYYY-MM format',
  })
  startMonthYear?: string;
}

export class PayInstallmentDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Number of installments to pay at once (default: 1)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;
}
