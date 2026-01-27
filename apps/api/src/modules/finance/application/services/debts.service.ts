// apps/api/src/modules/finance/application/services/debts.service.ts

import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AppLoggerService } from '../../../../logger/logger.service';
import type { Debt, NewDebt } from '@life-assistant/database';
import {
  DEBTS_REPOSITORY,
  type DebtsRepositoryPort,
  type DebtSearchParams,
  type DebtSummary,
} from '../../domain/ports/debts.repository.port';

@Injectable()
export class DebtsService {
  constructor(
    @Inject(DEBTS_REPOSITORY)
    private readonly repository: DebtsRepositoryPort,
    private readonly logger: AppLoggerService
  ) {
    this.logger.setContext(DebtsService.name);
  }

  async create(userId: string, data: Omit<NewDebt, 'userId'>): Promise<Debt> {
    this.logger.log(`Creating debt for user ${userId}: ${data.name}`);

    // Validate negotiated debt has required fields
    if (data.isNegotiated !== false) {
      if (!data.totalInstallments || !data.installmentAmount || !data.dueDay) {
        throw new BadRequestException(
          'Negotiated debts require totalInstallments, installmentAmount, and dueDay'
        );
      }
    }

    const debt = await this.repository.create(userId, data);
    this.logger.log(`Debt created with id ${debt.id}`);
    return debt;
  }

  async findAll(
    userId: string,
    params: DebtSearchParams
  ): Promise<{ debts: Debt[]; total: number }> {
    const [debts, total] = await Promise.all([
      this.repository.findByUserId(userId, params),
      this.repository.countByUserId(userId, params),
    ]);
    return { debts, total };
  }

  async findById(userId: string, id: string): Promise<Debt> {
    const debt = await this.repository.findById(userId, id);
    if (!debt) {
      throw new NotFoundException(`Debt with id ${id} not found`);
    }
    return debt;
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<NewDebt, 'userId'>>
  ): Promise<Debt> {
    this.logger.log(`Updating debt ${id} for user ${userId}`);
    const debt = await this.repository.update(userId, id, data);
    if (!debt) {
      throw new NotFoundException(`Debt with id ${id} not found`);
    }
    this.logger.log(`Debt ${id} updated successfully`);
    return debt;
  }

  async delete(userId: string, id: string): Promise<void> {
    this.logger.log(`Deleting debt ${id} for user ${userId}`);
    const deleted = await this.repository.delete(userId, id);
    if (!deleted) {
      throw new NotFoundException(`Debt with id ${id} not found`);
    }
    this.logger.log(`Debt ${id} deleted successfully`);
  }

  async payInstallment(
    userId: string,
    id: string,
    quantity = 1
  ): Promise<Debt> {
    this.logger.log(
      `Paying ${String(quantity)} installment(s) for debt ${id} for user ${userId}`
    );

    // First check if debt exists and is negotiated
    const existingDebt = await this.repository.findById(userId, id);
    if (!existingDebt) {
      throw new NotFoundException(`Debt with id ${id} not found`);
    }
    if (!existingDebt.isNegotiated) {
      throw new BadRequestException(
        'Cannot pay installment on non-negotiated debt'
      );
    }
    if (existingDebt.status === 'paid_off') {
      throw new BadRequestException('Debt is already paid off');
    }

    // Validate quantity doesn't exceed remaining installments
    const remainingInstallments =
      (existingDebt.totalInstallments ?? 0) - (existingDebt.currentInstallment - 1);
    if (quantity > remainingInstallments) {
      throw new BadRequestException(
        `Cannot pay ${String(quantity)} installments. Only ${String(remainingInstallments)} remaining.`
      );
    }

    const debt = await this.repository.payInstallment(userId, id, quantity);
    if (!debt) {
      throw new NotFoundException(`Debt with id ${id} not found`);
    }

    this.logger.log(
      `${String(quantity)} installment(s) paid for debt ${id}. Current: ${String(debt.currentInstallment)}/${String(debt.totalInstallments)}`
    );
    return debt;
  }

  /**
   * Check and update overdue status for a debt based on current month.
   * A debt is overdue when currentInstallment < expected installments by time elapsed.
   */
  async checkAndUpdateOverdueStatus(
    userId: string,
    id: string,
    currentMonth: string
  ): Promise<void> {
    const debt = await this.repository.findById(userId, id);
    if (!debt || !debt.isNegotiated || debt.status !== 'active') return;
    if (!debt.startMonthYear || !debt.totalInstallments) return;

    // Calculate expected paid installments
    const startDate = new Date(debt.startMonthYear + '-01');
    const currentDate = new Date(currentMonth + '-01');

    const monthsDiff =
      (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
      (currentDate.getMonth() - startDate.getMonth()) +
      1;

    const expectedPaidInstallments = Math.min(monthsDiff, debt.totalInstallments);
    const actualPaidInstallments = debt.currentInstallment - 1;

    if (actualPaidInstallments < expectedPaidInstallments) {
      this.logger.log(
        `Debt ${id} is overdue: expected ${String(expectedPaidInstallments)} paid, actual ${String(actualPaidInstallments)}`
      );
      await this.repository.update(userId, id, { status: 'overdue' });
    }
  }

  async negotiate(
    userId: string,
    id: string,
    data: {
      totalInstallments: number;
      installmentAmount: number;
      dueDay: number;
      startMonthYear?: string;
    }
  ): Promise<Debt> {
    this.logger.log(`Negotiating debt ${id} for user ${userId}`);

    const existingDebt = await this.repository.findById(userId, id);
    if (!existingDebt) {
      throw new NotFoundException(`Debt with id ${id} not found`);
    }
    if (existingDebt.isNegotiated) {
      throw new BadRequestException('Debt is already negotiated');
    }

    const debt = await this.repository.negotiate(userId, id, data);
    if (!debt) {
      throw new NotFoundException(`Debt with id ${id} not found`);
    }

    this.logger.log(`Debt ${id} negotiated successfully`);
    return debt;
  }

  async getSummary(userId: string, monthYear?: string): Promise<DebtSummary> {
    return this.repository.getSummary(userId, monthYear);
  }

  async sumPaymentsByMonthYear(
    userId: string,
    monthYear: string
  ): Promise<number> {
    return this.repository.sumPaymentsByMonthYear(userId, monthYear);
  }
}
