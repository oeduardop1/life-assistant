// apps/api/src/modules/finance/application/services/incomes.service.ts

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppLoggerService } from '../../../../logger/logger.service';
import type { Income, NewIncome } from '@life-assistant/database';
import {
  INCOMES_REPOSITORY,
  type IncomesRepositoryPort,
  type IncomeSearchParams,
} from '../../domain/ports/incomes.repository.port';

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
export class IncomesService {
  constructor(
    @Inject(INCOMES_REPOSITORY)
    private readonly repository: IncomesRepositoryPort,
    private readonly logger: AppLoggerService
  ) {
    this.logger.setContext(IncomesService.name);
  }

  async create(
    userId: string,
    data: Omit<NewIncome, 'userId'>
  ): Promise<Income> {
    this.logger.log(`Creating income for user ${userId}: ${data.name}`);
    const createData = data.isRecurring
      ? { ...data, recurringGroupId: data.recurringGroupId ?? randomUUID() }
      : data;
    const income = await this.repository.create(userId, createData);
    this.logger.log(`Income created with id ${income.id}`);
    return income;
  }

  async findAll(
    userId: string,
    params: IncomeSearchParams
  ): Promise<{ incomes: Income[]; total: number }> {
    if (params.monthYear) {
      await this.ensureRecurringForMonth(userId, params.monthYear);
    }
    const [incomes, total] = await Promise.all([
      this.repository.findByUserId(userId, params),
      this.repository.countByUserId(userId, params),
    ]);
    return { incomes, total };
  }

  async findById(userId: string, id: string): Promise<Income> {
    const income = await this.repository.findById(userId, id);
    if (!income) {
      throw new NotFoundException(`Income with id ${id} not found`);
    }
    return income;
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<NewIncome, 'userId'>>
  ): Promise<Income> {
    this.logger.log(`Updating income ${id} for user ${userId}`);
    const income = await this.repository.update(userId, id, data);
    if (!income) {
      throw new NotFoundException(`Income with id ${id} not found`);
    }
    this.logger.log(`Income ${id} updated successfully`);
    return income;
  }

  async delete(userId: string, id: string): Promise<void> {
    this.logger.log(`Deleting income ${id} for user ${userId}`);
    const deleted = await this.repository.delete(userId, id);
    if (!deleted) {
      throw new NotFoundException(`Income with id ${id} not found`);
    }
    this.logger.log(`Income ${id} deleted successfully`);
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

    const newItems: Omit<NewIncome, 'userId'>[] = [];

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
          type: item.type,
          frequency: item.frequency,
          expectedAmount: item.expectedAmount,
          actualAmount: null,
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
        `Generated ${String(newItems.length)} recurring incomes for ${targetMonth}`
      );
    }
  }

  async updateWithScope(
    userId: string,
    id: string,
    data: Partial<Omit<NewIncome, 'userId'>>,
    scope: RecurringScope
  ): Promise<Income> {
    const income = await this.findById(userId, id);

    if (scope === 'this' || !income.recurringGroupId) {
      return this.update(userId, id, data);
    }

    if (scope === 'future') {
      const updated = await this.update(userId, id, data);
      await this.repository.updateByRecurringGroupIdAfterMonth(
        userId,
        income.recurringGroupId,
        income.monthYear,
        data
      );
      return updated;
    }

    // scope === 'all'
    const all = await this.repository.findByRecurringGroupId(
      userId,
      income.recurringGroupId
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
    const income = await this.findById(userId, id);

    if (scope === 'this' || !income.recurringGroupId) {
      await this.repository.delete(userId, id);
      this.logger.log(`Income ${id} deleted (scope: this)`);
      return;
    }

    if (scope === 'future') {
      await this.repository.update(userId, id, { isRecurring: false });
      await this.repository.deleteByRecurringGroupIdAfterMonth(
        userId,
        income.recurringGroupId,
        income.monthYear
      );
      this.logger.log(`Income ${id} recurrence stopped (scope: future)`);
      return;
    }

    // scope === 'all'
    await this.repository.deleteByRecurringGroupId(
      userId,
      income.recurringGroupId
    );
    this.logger.log(`All incomes in group ${income.recurringGroupId} deleted`);
  }
}
