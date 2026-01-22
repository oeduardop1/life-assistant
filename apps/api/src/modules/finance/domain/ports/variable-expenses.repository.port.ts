// apps/api/src/modules/finance/domain/ports/variable-expenses.repository.port.ts

import type { VariableExpense, NewVariableExpense } from '@life-assistant/database';

export interface VariableExpenseSearchParams {
  monthYear?: string | undefined;
  category?: string | undefined;
  isRecurring?: boolean | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface VariableExpensesRepositoryPort {
  create(
    userId: string,
    data: Omit<NewVariableExpense, 'userId'>
  ): Promise<VariableExpense>;
  findByUserId(
    userId: string,
    params: VariableExpenseSearchParams
  ): Promise<VariableExpense[]>;
  findById(userId: string, id: string): Promise<VariableExpense | null>;
  update(
    userId: string,
    id: string,
    data: Partial<Omit<NewVariableExpense, 'userId'>>
  ): Promise<VariableExpense | null>;
  delete(userId: string, id: string): Promise<boolean>;
  countByUserId(
    userId: string,
    params: VariableExpenseSearchParams
  ): Promise<number>;
  sumByMonthYear(
    userId: string,
    monthYear: string,
    field: 'expectedAmount' | 'actualAmount'
  ): Promise<number>;
}

export const VARIABLE_EXPENSES_REPOSITORY = Symbol('VARIABLE_EXPENSES_REPOSITORY');
