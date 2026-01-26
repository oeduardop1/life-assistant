// apps/api/src/modules/finance/application/services/variable-expenses.service.ts

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppLoggerService } from '../../../../logger/logger.service';
import type { VariableExpense, NewVariableExpense } from '@life-assistant/database';
import {
  VARIABLE_EXPENSES_REPOSITORY,
  type VariableExpensesRepositoryPort,
  type VariableExpenseSearchParams,
} from '../../domain/ports/variable-expenses.repository.port';

export type RecurringScope = 'this' | 'future' | 'all';

function getPreviousMonth(monthYear: string): string {
  const parts = monthYear.split('-');
  const yearStr = parts[0];
  const monthStr = parts[1];
  if (!yearStr || !monthStr) {
    throw new Error(`Invalid monthYear format: ${monthYear}`);
  }
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (month === 1) {
    return `${String(year - 1)}-12`;
  }
  return `${String(year)}-${String(month - 1).padStart(2, '0')}`;
}

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
    const createData = data.isRecurring
      ? { ...data, recurringGroupId: data.recurringGroupId ?? randomUUID() }
      : data;
    const expense = await this.repository.create(userId, createData);
    this.logger.log(`Variable expense created with id ${expense.id}`);
    return expense;
  }

  async findAll(
    userId: string,
    params: VariableExpenseSearchParams
  ): Promise<{ expenses: VariableExpense[]; total: number }> {
    if (params.monthYear) {
      await this.ensureRecurringForMonth(userId, params.monthYear);
    }
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

  // ===========================================================================
  // Recurring Methods
  // ===========================================================================

  async ensureRecurringForMonth(
    userId: string,
    targetMonth: string
  ): Promise<void> {
    const previousMonth = getPreviousMonth(targetMonth);
    const recurringItems = await this.repository.findRecurringByMonth(
      userId,
      previousMonth
    );

    if (recurringItems.length === 0) return;

    const newItems: Omit<NewVariableExpense, 'userId'>[] = [];

    for (const item of recurringItems) {
      if (!item.recurringGroupId) continue;

      const existing = await this.repository.findByRecurringGroupIdAndMonth(
        userId,
        item.recurringGroupId,
        targetMonth
      );

      if (!existing) {
        newItems.push({
          name: item.name,
          category: item.category,
          expectedAmount: item.expectedAmount,
          actualAmount: '0',
          currency: item.currency,
          isRecurring: true,
          recurringGroupId: item.recurringGroupId,
          monthYear: targetMonth,
        });
      }
    }

    if (newItems.length > 0) {
      await this.repository.createMany(userId, newItems);
      this.logger.log(
        `Generated ${String(newItems.length)} recurring expenses for ${targetMonth}`
      );
    }
  }

  async updateWithScope(
    userId: string,
    id: string,
    data: Partial<Omit<NewVariableExpense, 'userId'>>,
    scope: RecurringScope
  ): Promise<VariableExpense> {
    const expense = await this.findById(userId, id);

    if (scope === 'this' || !expense.recurringGroupId) {
      return this.update(userId, id, data);
    }

    if (scope === 'future') {
      const updated = await this.update(userId, id, data);
      await this.repository.updateByRecurringGroupIdAfterMonth(
        userId,
        expense.recurringGroupId,
        expense.monthYear,
        data
      );
      return updated;
    }

    // scope === 'all'
    const all = await this.repository.findByRecurringGroupId(
      userId,
      expense.recurringGroupId
    );
    for (const entry of all) {
      await this.repository.update(userId, entry.id, data);
    }
    return this.findById(userId, id);
  }

  async deleteWithScope(
    userId: string,
    id: string,
    scope: RecurringScope
  ): Promise<void> {
    const expense = await this.findById(userId, id);

    if (scope === 'this' || !expense.recurringGroupId) {
      await this.repository.delete(userId, id);
      this.logger.log(`Variable expense ${id} deleted (scope: this)`);
      return;
    }

    if (scope === 'future') {
      await this.repository.update(userId, id, { isRecurring: false });
      await this.repository.deleteByRecurringGroupIdAfterMonth(
        userId,
        expense.recurringGroupId,
        expense.monthYear
      );
      this.logger.log(`Variable expense ${id} recurrence stopped (scope: future)`);
      return;
    }

    // scope === 'all'
    await this.repository.deleteByRecurringGroupId(
      userId,
      expense.recurringGroupId
    );
    this.logger.log(`All expenses in group ${expense.recurringGroupId} deleted`);
  }
}
