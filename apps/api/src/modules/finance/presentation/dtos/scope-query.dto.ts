// apps/api/src/modules/finance/presentation/dtos/scope-query.dto.ts

import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ScopeQueryDto {
  @ApiPropertyOptional({
    enum: ['this', 'future', 'all'],
    default: 'this',
    description: 'Scope for recurring item operations: this (only this month), future (this and future months), all (entire series)',
  })
  @IsOptional()
  @IsIn(['this', 'future', 'all'])
  scope?: 'this' | 'future' | 'all';
}
