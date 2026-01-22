// apps/api/src/modules/finance/presentation/dtos/investment.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InvestmentTypeDto {
  EMERGENCY_FUND = 'emergency_fund',
  RETIREMENT = 'retirement',
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  EDUCATION = 'education',
  CUSTOM = 'custom',
}

export class CreateInvestmentDto {
  @ApiProperty({ example: 'Reserva de Emergência', description: 'Investment name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: InvestmentTypeDto, example: InvestmentTypeDto.EMERGENCY_FUND })
  @IsEnum(InvestmentTypeDto)
  type: InvestmentTypeDto;

  @ApiPropertyOptional({ example: 30000, description: 'Goal amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  goalAmount?: number;

  @ApiPropertyOptional({ example: 15000, default: 0, description: 'Current amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentAmount?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Monthly contribution' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyContribution?: number;

  @ApiPropertyOptional({ example: '2027-12-31', description: 'Target deadline' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ example: 'BRL', default: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateInvestmentDto {
  @ApiPropertyOptional({ example: 'Reserva de Emergência' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: InvestmentTypeDto })
  @IsOptional()
  @IsEnum(InvestmentTypeDto)
  type?: InvestmentTypeDto;

  @ApiPropertyOptional({ example: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  goalAmount?: number;

  @ApiPropertyOptional({ example: 15000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentAmount?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyContribution?: number;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ example: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateInvestmentValueDto {
  @ApiProperty({ example: 16500, description: 'New current amount' })
  @IsNumber()
  @Min(0)
  currentAmount: number;
}
