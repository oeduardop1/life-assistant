// apps/api/src/modules/finance/application/services/bills.service.ts

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppLoggerService } from '../../../../logger/logger.service';
import type { Bill, NewBill } from '@life-assistant/database';
import {
  BILLS_REPOSITORY,
  type BillsRepositoryPort,
  type BillSearchParams,
} from '../../domain/ports/bills.repository.port';

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
export class BillsService {
  constructor(
    @Inject(BILLS_REPOSITORY)
    private readonly repository: BillsRepositoryPort,
    private readonly logger: AppLoggerService
  ) {
    this.logger.setContext(BillsService.name);
  }

  async create(userId: string, data: Omit<NewBill, 'userId'>): Promise<Bill> {
    this.logger.log(`Creating bill for user ${userId}: ${data.name}`);
    const createData = data.isRecurring
      ? { ...data, recurringGroupId: data.recurringGroupId ?? randomUUID() }
      : data;
    const bill = await this.repository.create(userId, createData);
    this.logger.log(`Bill created with id ${bill.id}`);
    return bill;
  }

  async findAll(
    userId: string,
    params: BillSearchParams
  ): Promise<{ bills: Bill[]; total: number }> {
    if (params.monthYear) {
      await this.ensureRecurringForMonth(userId, params.monthYear);
    }
    const [bills, total] = await Promise.all([
      this.repository.findByUserId(userId, params),
      this.repository.countByUserId(userId, params),
    ]);
    return { bills, total };
  }

  async findById(userId: string, id: string): Promise<Bill> {
    const bill = await this.repository.findById(userId, id);
    if (!bill) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }
    return bill;
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<NewBill, 'userId'>>
  ): Promise<Bill> {
    this.logger.log(`Updating bill ${id} for user ${userId}`);
    const bill = await this.repository.update(userId, id, data);
    if (!bill) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }
    this.logger.log(`Bill ${id} updated successfully`);
    return bill;
  }

  async delete(userId: string, id: string): Promise<void> {
    this.logger.log(`Deleting bill ${id} for user ${userId}`);
    const deleted = await this.repository.delete(userId, id);
    if (!deleted) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }
    this.logger.log(`Bill ${id} deleted successfully`);
  }

  async markAsPaid(userId: string, id: string): Promise<Bill> {
    this.logger.log(`Marking bill ${id} as paid for user ${userId}`);
    const bill = await this.repository.markAsPaid(userId, id);
    if (!bill) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }
    this.logger.log(`Bill ${id} marked as paid`);
    return bill;
  }

  async markAsUnpaid(userId: string, id: string): Promise<Bill> {
    this.logger.log(`Marking bill ${id} as unpaid for user ${userId}`);
    const bill = await this.repository.markAsUnpaid(userId, id);
    if (!bill) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }
    this.logger.log(`Bill ${id} marked as unpaid`);
    return bill;
  }

  async sumByMonthYear(userId: string, monthYear: string): Promise<number> {
    return this.repository.sumByMonthYear(userId, monthYear);
  }

  async sumByMonthYearAndStatus(
    userId: string,
    monthYear: string,
    status: string
  ): Promise<number> {
    return this.repository.sumByMonthYearAndStatus(userId, monthYear, status);
  }

  async countByStatus(
    userId: string,
    monthYear: string
  ): Promise<Record<string, number>> {
    return this.repository.countByStatus(userId, monthYear);
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

    const newItems: Omit<NewBill, 'userId'>[] = [];

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
          amount: item.amount,
          dueDay: item.dueDay,
          currency: item.currency,
          isRecurring: true,
          recurringGroupId: item.recurringGroupId,
          monthYear: targetMonth,
          status: 'pending',
          paidAt: null,
        });
      }
    }

    if (newItems.length > 0) {
      await this.repository.createMany(userId, newItems);
      this.logger.log(
        `Generated ${String(newItems.length)} recurring bills for ${targetMonth}`
      );
    }
  }

  async updateWithScope(
    userId: string,
    id: string,
    data: Partial<Omit<NewBill, 'userId'>>,
    scope: RecurringScope
  ): Promise<Bill> {
    const bill = await this.findById(userId, id);

    if (scope === 'this' || !bill.recurringGroupId) {
      return this.update(userId, id, data);
    }

    if (scope === 'future') {
      const updated = await this.update(userId, id, data);
      await this.repository.updateByRecurringGroupIdAfterMonth(
        userId,
        bill.recurringGroupId,
        bill.monthYear,
        data
      );
      return updated;
    }

    // scope === 'all'
    const all = await this.repository.findByRecurringGroupId(
      userId,
      bill.recurringGroupId
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
    const bill = await this.findById(userId, id);

    if (scope === 'this' || !bill.recurringGroupId) {
      // Mark as canceled (don't delete — lazy gen would recreate)
      await this.repository.update(userId, id, { status: 'canceled' });
      this.logger.log(`Bill ${id} canceled (scope: this)`);
      return;
    }

    if (scope === 'future') {
      // Cancel current month AND stop recurrence
      await this.repository.update(userId, id, { status: 'canceled', isRecurring: false });
      await this.repository.deleteByRecurringGroupIdAfterMonth(
        userId,
        bill.recurringGroupId,
        bill.monthYear
      );
      this.logger.log(`Bill ${id} and future months canceled/deleted (scope: future)`);
      return;
    }

    // scope === 'all'
    await this.repository.deleteByRecurringGroupId(
      userId,
      bill.recurringGroupId
    );
    this.logger.log(`All bills in group ${bill.recurringGroupId} deleted`);
  }
}
