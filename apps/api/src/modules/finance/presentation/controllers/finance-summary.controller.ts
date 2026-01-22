// apps/api/src/modules/finance/presentation/controllers/finance-summary.controller.ts

import { Controller, Get, Query, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../common/types/request.types';
import { FinanceSummaryService } from '../../application/services/finance-summary.service';
import { FinanceSummaryQueryDto } from '../dtos/query.dto';

@ApiTags('Finance - Summary')
@ApiBearerAuth()
@Controller('finance/summary')
export class FinanceSummaryController {
  constructor(private readonly financeSummaryService: FinanceSummaryService) {}

  @Get()
  @ApiOperation({
    summary: 'Get finance summary',
    description: 'Returns all KPIs for the selected month',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Finance summary for the month',
  })
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinanceSummaryQueryDto
  ) {
    const summary = await this.financeSummaryService.getSummary(
      user.id,
      query.monthYear
    );
    return { summary };
  }
}
