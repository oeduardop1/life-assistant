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
  type DebtPaymentHistoryResult,
  type UpcomingInstallmentsResult,
  type DebtProjection,
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

  async getPaymentHistory(
    userId: string,
    debtId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<DebtPaymentHistoryResult> {
    this.logger.log(`Getting payment history for debt ${debtId}`);

    // First get the debt to include in the response
    const debt = await this.repository.findById(userId, debtId);
    if (!debt) {
      throw new NotFoundException(`Debt with id ${debtId} not found`);
    }

    const payments = await this.repository.getPaymentHistory(
      userId,
      debtId,
      params
    );

    // Calculate summary
    const totalAmount = payments.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0
    );
    const paidEarlyCount = payments.filter((p) => p.paidEarly).length;

    return {
      payments,
      summary: {
        totalPayments: payments.length,
        totalAmount,
        paidEarlyCount,
      },
      debt: {
        id: debt.id,
        name: debt.name,
        totalInstallments: debt.totalInstallments,
        paidInstallments: debt.currentInstallment - 1,
      },
    };
  }

  async getUpcomingInstallments(
    userId: string,
    monthYear?: string
  ): Promise<UpcomingInstallmentsResult> {
    // Default to current month if not specified
    const targetMonth =
      monthYear ??
      `${String(new Date().getFullYear())}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    this.logger.log(`Getting upcoming installments for ${targetMonth}`);

    const installments = await this.repository.getUpcomingInstallments(
      userId,
      targetMonth
    );

    // Calculate summary
    const totalAmount = installments.reduce((sum, i) => sum + i.amount, 0);
    const pendingCount = installments.filter((i) => i.status === 'pending').length;
    const paidCount = installments.filter((i) => i.status === 'paid').length;
    const paidEarlyCount = installments.filter((i) => i.status === 'paid_early').length;
    const overdueCount = installments.filter((i) => i.status === 'overdue').length;

    return {
      installments,
      summary: {
        totalAmount,
        pendingCount,
        paidCount,
        paidEarlyCount,
        overdueCount,
      },
    };
  }

  /**
   * Calculate payoff projection for a debt based on payment history.
   * Analyzes payment velocity (how many payments per month) to estimate
   * when the debt will be fully paid off.
   *
   * @param userId - User ID
   * @param debtId - Debt ID
   * @returns Projection including estimated payoff date, remaining months, and velocity
   */
  async calculateProjection(
    userId: string,
    debtId: string
  ): Promise<DebtProjection> {
    const debt = await this.repository.findById(userId, debtId);
    if (!debt) {
      throw new NotFoundException(`Debt with id ${debtId} not found`);
    }

    // If debt is already paid off or not negotiated, return appropriate message
    if (debt.status === 'paid_off') {
      return {
        estimatedPayoffMonthYear: null,
        remainingMonths: 0,
        paymentVelocity: { avgPaymentsPerMonth: 0, isRegular: true },
        message: 'Dívida já quitada.',
      };
    }

    if (!debt.isNegotiated || !debt.totalInstallments) {
      return {
        estimatedPayoffMonthYear: null,
        remainingMonths: 0,
        paymentVelocity: { avgPaymentsPerMonth: 0, isRegular: false },
        message: 'Dívida não negociada - não é possível calcular projeção.',
      };
    }

    const paidInstallments = debt.currentInstallment - 1;
    const remainingInstallments = debt.totalInstallments - paidInstallments;

    // If no payments yet, use startMonthYear to estimate (1 payment per month)
    if (paidInstallments === 0) {
      const startDate = debt.startMonthYear
        ? new Date(debt.startMonthYear + '-01')
        : new Date();
      const payoffDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + remainingInstallments - 1,
        1
      );
      const payoffMonthYear = `${String(payoffDate.getFullYear())}-${String(payoffDate.getMonth() + 1).padStart(2, '0')}`;

      return {
        estimatedPayoffMonthYear: payoffMonthYear,
        remainingMonths: remainingInstallments,
        paymentVelocity: { avgPaymentsPerMonth: 1, isRegular: true },
        message: this.formatProjectionMessage(payoffMonthYear, remainingInstallments),
      };
    }

    // Get payment history to calculate velocity
    const payments = await this.repository.getPaymentHistory(userId, debtId);

    if (payments.length === 0) {
      return {
        estimatedPayoffMonthYear: null,
        remainingMonths: remainingInstallments,
        paymentVelocity: { avgPaymentsPerMonth: 0, isRegular: false },
        message: 'Sem histórico de pagamentos para calcular projeção.',
      };
    }

    // Group payments by month (when they were actually made, not which month they belong to)
    const paymentsByMonth = new Map<string, number>();
    for (const payment of payments) {
      const paidMonth = `${String(payment.paidAt.getFullYear())}-${String(payment.paidAt.getMonth() + 1).padStart(2, '0')}`;
      paymentsByMonth.set(paidMonth, (paymentsByMonth.get(paidMonth) ?? 0) + 1);
    }

    // Calculate average payments per month
    const months = Array.from(paymentsByMonth.keys()).sort();
    const firstPaymentMonth = months[0] ?? '';
    const lastPaymentMonth = months[months.length - 1] ?? '';

    // Calculate months elapsed
    const firstDate = new Date(`${firstPaymentMonth}-01`);
    const lastDate = new Date(`${lastPaymentMonth}-01`);
    const monthsElapsed =
      (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
      (lastDate.getMonth() - firstDate.getMonth()) +
      1;

    const avgPaymentsPerMonth = paidInstallments / monthsElapsed;

    // Check if payments are regular (variation < 20%)
    const paymentsPerMonth = Array.from(paymentsByMonth.values());
    const avgPerMonth =
      paymentsPerMonth.reduce((a, b) => a + b, 0) / paymentsPerMonth.length;
    const variance =
      paymentsPerMonth.reduce(
        (sum, val) => sum + Math.pow(val - avgPerMonth, 2),
        0
      ) / paymentsPerMonth.length;
    const stdDev = Math.sqrt(variance);
    const isRegular = avgPerMonth > 0 ? stdDev / avgPerMonth < 0.3 : true;

    // Estimate payoff date
    if (avgPaymentsPerMonth <= 0) {
      return {
        estimatedPayoffMonthYear: null,
        remainingMonths: remainingInstallments,
        paymentVelocity: { avgPaymentsPerMonth: 0, isRegular: false },
        message: 'Velocidade de pagamento muito baixa para estimar quitação.',
      };
    }

    const remainingMonths = Math.ceil(remainingInstallments / avgPaymentsPerMonth);
    const now = new Date();
    const payoffDate = new Date(
      now.getFullYear(),
      now.getMonth() + remainingMonths,
      1
    );
    const payoffMonthYear = `${String(payoffDate.getFullYear())}-${String(payoffDate.getMonth() + 1).padStart(2, '0')}`;

    return {
      estimatedPayoffMonthYear: payoffMonthYear,
      remainingMonths,
      paymentVelocity: {
        avgPaymentsPerMonth: Math.round(avgPaymentsPerMonth * 100) / 100,
        isRegular,
      },
      message: this.formatProjectionMessage(payoffMonthYear, remainingMonths, avgPaymentsPerMonth),
    };
  }

  /**
   * Format projection message in Portuguese
   */
  private formatProjectionMessage(
    payoffMonthYear: string,
    remainingMonths: number,
    avgPaymentsPerMonth?: number
  ): string {
    const parts = payoffMonthYear.split('-').map(Number);
    const year = parts[0] ?? new Date().getFullYear();
    const month = parts[1] ?? 1;
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    const monthName = monthNames[month - 1] ?? 'Janeiro';

    if (avgPaymentsPerMonth && avgPaymentsPerMonth > 1.2) {
      return `Pagando ~${String(Math.round(avgPaymentsPerMonth))} parcelas/mês, você quita em ${monthName}/${String(year)} (${String(remainingMonths)} meses).`;
    }

    return `No ritmo atual, você quita em ${monthName}/${String(year)} (${String(remainingMonths)} meses).`;
  }
}
