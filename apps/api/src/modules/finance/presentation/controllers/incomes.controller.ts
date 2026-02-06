// apps/api/src/modules/finance/presentation/controllers/incomes.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../common/types/request.types';
import { IncomesService } from '../../application/services/incomes.service';
import { CreateIncomeDto, UpdateIncomeDto } from '../dtos/income.dto';
import { IncomeQueryDto } from '../dtos/query.dto';
import { ScopeQueryDto } from '../dtos/scope-query.dto';

@ApiTags('Finance - Incomes')
@ApiBearerAuth()
@Controller('finance/incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new income' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Income created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateIncomeDto
  ) {
    const income = await this.incomesService.create(user.id, {
      name: dto.name,
      type: dto.type,
      frequency: dto.frequency,
      expectedAmount: dto.expectedAmount.toString(),
      actualAmount: dto.actualAmount?.toString(),
      isRecurring: dto.isRecurring ?? true,
      monthYear: dto.monthYear,
      currency: dto.currency ?? 'BRL',
    });
    return { income };
  }

  @Get()
  @ApiOperation({ summary: 'List incomes' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of incomes' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: IncomeQueryDto
  ) {
    const { incomes, total } = await this.incomesService.findAll(user.id, {
      monthYear: query.monthYear,
      type: query.type,
      isRecurring: query.isRecurring,
      limit: query.limit,
      offset: query.offset,
    });
    return { incomes, total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get income by ID' })
  @ApiParam({ name: 'id', description: 'Income ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Income found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Income not found' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const income = await this.incomesService.findById(user.id, id);
    return { income };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update income' })
  @ApiParam({ name: 'id', description: 'Income ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Income updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Income not found' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateIncomeDto,
    @Query() scopeQuery: ScopeQueryDto
  ) {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.frequency !== undefined) updateData.frequency = dto.frequency;
    if (dto.expectedAmount !== undefined)
      updateData.expectedAmount = dto.expectedAmount.toString();
    if (dto.actualAmount !== undefined)
      updateData.actualAmount = dto.actualAmount?.toString() ?? null;
    if (dto.isRecurring !== undefined) updateData.isRecurring = dto.isRecurring;
    if (dto.monthYear !== undefined) updateData.monthYear = dto.monthYear;
    if (dto.currency !== undefined) updateData.currency = dto.currency;

    const income = await this.incomesService.updateWithScope(
      user.id,
      id,
      updateData,
      scopeQuery.scope ?? 'this'
    );
    return { income };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete income' })
  @ApiParam({ name: 'id', description: 'Income ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Income deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Income not found' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() scopeQuery: ScopeQueryDto
  ) {
    await this.incomesService.deleteWithScope(user.id, id, scopeQuery.scope ?? 'this');
  }
}
