// apps/api/src/modules/finance/domain/ports/bills.repository.port.ts

import type { Bill, NewBill } from '@life-assistant/database';

export interface BillSearchParams {
  monthYear?: string | undefined;
  category?: string | undefined;
  status?: string | undefined;
  isRecurring?: boolean | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface BillsRepositoryPort {
  create(userId: string, data: Omit<NewBill, 'userId'>): Promise<Bill>;
  findByUserId(userId: string, params: BillSearchParams): Promise<Bill[]>;
  findById(userId: string, id: string): Promise<Bill | null>;
  update(
    userId: string,
    id: string,
    data: Partial<Omit<NewBill, 'userId'>>
  ): Promise<Bill | null>;
  delete(userId: string, id: string): Promise<boolean>;
  countByUserId(userId: string, params: BillSearchParams): Promise<number>;
  markAsPaid(userId: string, id: string): Promise<Bill | null>;
  markAsUnpaid(userId: string, id: string): Promise<Bill | null>;
  sumByMonthYear(userId: string, monthYear: string): Promise<number>;
  sumByMonthYearAndStatus(
    userId: string,
    monthYear: string,
    status: string
  ): Promise<number>;
  countByStatus(
    userId: string,
    monthYear: string
  ): Promise<Record<string, number>>;

  // Recurring methods
  findRecurringByMonth(userId: string, monthYear: string): Promise<Bill[]>;
  findByRecurringGroupIdAndMonth(
    userId: string,
    recurringGroupId: string,
    monthYear: string
  ): Promise<Bill | null>;
  findByRecurringGroupId(
    userId: string,
    recurringGroupId: string
  ): Promise<Bill[]>;
  createMany(
    userId: string,
    data: Omit<NewBill, 'userId'>[]
  ): Promise<Bill[]>;
  updateByRecurringGroupIdAfterMonth(
    userId: string,
    recurringGroupId: string,
    afterMonthYear: string,
    data: Partial<Omit<NewBill, 'userId'>>
  ): Promise<number>;
  deleteByRecurringGroupIdAfterMonth(
    userId: string,
    recurringGroupId: string,
    afterMonthYear: string
  ): Promise<number>;
  deleteByRecurringGroupId(
    userId: string,
    recurringGroupId: string
  ): Promise<number>;
}

export const BILLS_REPOSITORY = Symbol('BILLS_REPOSITORY');
