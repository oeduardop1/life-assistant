// apps/api/src/modules/finance/presentation/controllers/variable-expenses.controller.ts

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
import { VariableExpensesService } from '../../application/services/variable-expenses.service';
import {
  CreateVariableExpenseDto,
  UpdateVariableExpenseDto,
} from '../dtos/variable-expense.dto';
import { VariableExpenseQueryDto } from '../dtos/query.dto';

@ApiTags('Finance - Variable Expenses')
@ApiBearerAuth()
@Controller('finance/expenses')
export class VariableExpensesController {
  constructor(
    private readonly variableExpensesService: VariableExpensesService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new variable expense' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Expense created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVariableExpenseDto
  ) {
    const expense = await this.variableExpensesService.create(user.id, {
      name: dto.name,
      category: dto.category,
      expectedAmount: dto.expectedAmount.toString(),
      actualAmount: dto.actualAmount?.toString() ?? '0',
      isRecurring: dto.isRecurring ?? false,
      monthYear: dto.monthYear,
      currency: dto.currency ?? 'BRL',
    });
    return { expense };
  }

  @Get()
  @ApiOperation({ summary: 'List variable expenses' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of expenses' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: VariableExpenseQueryDto
  ) {
    const { expenses, total } = await this.variableExpensesService.findAll(
      user.id,
      {
        monthYear: query.monthYear,
        category: query.category,
        isRecurring: query.isRecurring,
        limit: query.limit,
        offset: query.offset,
      }
    );
    return { expenses, total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get variable expense by ID' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Expense found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Expense not found' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const expense = await this.variableExpensesService.findById(user.id, id);
    return { expense };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update variable expense' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Expense updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Expense not found' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateVariableExpenseDto
  ) {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.expectedAmount !== undefined)
      updateData.expectedAmount = dto.expectedAmount.toString();
    if (dto.actualAmount !== undefined)
      updateData.actualAmount = dto.actualAmount.toString();
    if (dto.isRecurring !== undefined) updateData.isRecurring = dto.isRecurring;
    if (dto.monthYear !== undefined) updateData.monthYear = dto.monthYear;
    if (dto.currency !== undefined) updateData.currency = dto.currency;

    const expense = await this.variableExpensesService.update(
      user.id,
      id,
      updateData
    );
    return { expense };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete variable expense' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Expense deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Expense not found' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    await this.variableExpensesService.delete(user.id, id);
  }
}
