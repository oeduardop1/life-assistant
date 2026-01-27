// apps/api/src/modules/finance/domain/ports/debts.repository.port.ts

import type { Debt, NewDebt, DebtPayment } from '@life-assistant/database';

export interface DebtSearchParams {
  monthYear?: string | undefined;
  status?: string | undefined;
  isNegotiated?: boolean | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface DebtSummary {
  totalDebts: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  negotiatedCount: number;
  monthlyInstallmentSum: number;
}

export interface DebtsRepositoryPort {
  create(userId: string, data: Omit<NewDebt, 'userId'>): Promise<Debt>;
  findByUserId(userId: string, params: DebtSearchParams): Promise<Debt[]>;
  findById(userId: string, id: string): Promise<Debt | null>;
  update(
    userId: string,
    id: string,
    data: Partial<Omit<NewDebt, 'userId'>>
  ): Promise<Debt | null>;
  delete(userId: string, id: string): Promise<boolean>;
  countByUserId(userId: string, params: DebtSearchParams): Promise<number>;
  payInstallment(userId: string, id: string, quantity?: number): Promise<Debt | null>;
  negotiate(
    userId: string,
    id: string,
    data: {
      totalInstallments: number;
      installmentAmount: number;
      dueDay: number;
      startMonthYear?: string;
    }
  ): Promise<Debt | null>;
  getSummary(userId: string, monthYear?: string): Promise<DebtSummary>;
  recordPayment(
    userId: string,
    debtId: string,
    data: { installmentNumber: number; amount: number; monthYear: string }
  ): Promise<DebtPayment>;
  sumPaymentsByMonthYear(userId: string, monthYear: string): Promise<number>;
}

export const DEBTS_REPOSITORY = Symbol('DEBTS_REPOSITORY');
