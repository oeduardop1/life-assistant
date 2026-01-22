// apps/api/src/modules/finance/domain/ports/incomes.repository.port.ts

import type { Income, NewIncome } from '@life-assistant/database';

export interface IncomeSearchParams {
  monthYear?: string | undefined;
  type?: string | undefined;
  isRecurring?: boolean | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface IncomesRepositoryPort {
  create(userId: string, data: Omit<NewIncome, 'userId'>): Promise<Income>;
  findByUserId(userId: string, params: IncomeSearchParams): Promise<Income[]>;
  findById(userId: string, id: string): Promise<Income | null>;
  update(
    userId: string,
    id: string,
    data: Partial<Omit<NewIncome, 'userId'>>
  ): Promise<Income | null>;
  delete(userId: string, id: string): Promise<boolean>;
  countByUserId(userId: string, params: IncomeSearchParams): Promise<number>;
  sumByMonthYear(
    userId: string,
    monthYear: string,
    field: 'expectedAmount' | 'actualAmount'
  ): Promise<number>;
}

export const INCOMES_REPOSITORY = Symbol('INCOMES_REPOSITORY');
