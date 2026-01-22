// apps/api/src/modules/finance/domain/ports/investments.repository.port.ts

import type { Investment, NewInvestment } from '@life-assistant/database';

export interface InvestmentSearchParams {
  type?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface InvestmentSummary {
  totalInvestments: number;
  totalCurrentAmount: number;
  totalGoalAmount: number;
  totalMonthlyContribution: number;
  averageProgress: number;
}

export interface InvestmentsRepositoryPort {
  create(userId: string, data: Omit<NewInvestment, 'userId'>): Promise<Investment>;
  findByUserId(
    userId: string,
    params: InvestmentSearchParams
  ): Promise<Investment[]>;
  findById(userId: string, id: string): Promise<Investment | null>;
  update(
    userId: string,
    id: string,
    data: Partial<Omit<NewInvestment, 'userId'>>
  ): Promise<Investment | null>;
  delete(userId: string, id: string): Promise<boolean>;
  countByUserId(userId: string, params: InvestmentSearchParams): Promise<number>;
  updateValue(
    userId: string,
    id: string,
    currentAmount: number
  ): Promise<Investment | null>;
  getSummary(userId: string): Promise<InvestmentSummary>;
}

export const INVESTMENTS_REPOSITORY = Symbol('INVESTMENTS_REPOSITORY');
