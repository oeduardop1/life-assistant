// apps/api/src/modules/finance/application/services/variable-expenses.service.ts

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { AppLoggerService } from '../../../../logger/logger.service';
import type { VariableExpense, NewVariableExpense } from '@life-assistant/database';
import {
  VARIABLE_EXPENSES_REPOSITORY,
  type VariableExpensesRepositoryPort,
  type VariableExpenseSearchParams,
} from '../../domain/ports/variable-expenses.repository.port';

@Injectable()
export class VariableExpensesService {
  constructor(
    @Inject(VARIABLE_EXPENSES_REPOSITORY)
    private readonly repository: VariableExpensesRepositoryPort,
    private readonly logger: AppLoggerService
  ) {
    this.logger.setContext(VariableExpensesService.name);
  }

  async create(
    userId: string,
    data: Omit<NewVariableExpense, 'userId'>
  ): Promise<VariableExpense> {
    this.logger.log(`Creating variable expense for user ${userId}: ${data.name}`);
    const expense = await this.repository.create(userId, data);
    this.logger.log(`Variable expense created with id ${expense.id}`);
    return expense;
  }

  async findAll(
    userId: string,
    params: VariableExpenseSearchParams
  ): Promise<{ expenses: VariableExpense[]; total: number }> {
    const [expenses, total] = await Promise.all([
      this.repository.findByUserId(userId, params),
      this.repository.countByUserId(userId, params),
    ]);
    return { expenses, total };
  }

  async findById(userId: string, id: string): Promise<VariableExpense> {
    const expense = await this.repository.findById(userId, id);
    if (!expense) {
      throw new NotFoundException(`Variable expense with id ${id} not found`);
    }
    return expense;
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<NewVariableExpense, 'userId'>>
  ): Promise<VariableExpense> {
    this.logger.log(`Updating variable expense ${id} for user ${userId}`);
    const expense = await this.repository.update(userId, id, data);
    if (!expense) {
      throw new NotFoundException(`Variable expense with id ${id} not found`);
    }
    this.logger.log(`Variable expense ${id} updated successfully`);
    return expense;
  }

  async delete(userId: string, id: string): Promise<void> {
    this.logger.log(`Deleting variable expense ${id} for user ${userId}`);
    const deleted = await this.repository.delete(userId, id);
    if (!deleted) {
      throw new NotFoundException(`Variable expense with id ${id} not found`);
    }
    this.logger.log(`Variable expense ${id} deleted successfully`);
  }

  async sumByMonthYear(
    userId: string,
    monthYear: string,
    field: 'expectedAmount' | 'actualAmount'
  ): Promise<number> {
    return this.repository.sumByMonthYear(userId, monthYear, field);
  }
}
