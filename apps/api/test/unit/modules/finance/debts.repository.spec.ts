import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database package
vi.mock('@life-assistant/database', () => ({
  eq: vi.fn(() => 'eq-result'),
  and: vi.fn((...args: unknown[]) => args),
  count: vi.fn(() => 'count-result'),
}));

import { DebtsRepository } from '../../../../src/modules/finance/infrastructure/repositories/debts.repository.js';

/**
 * Create a mock debt for testing calculations
 */
function createMockDebt(
  overrides: Partial<{
    id: string;
    userId: string;
    name: string;
    creditor: string | null;
    totalAmount: string;
    isNegotiated: boolean;
    totalInstallments: number | null;
    installmentAmount: string | null;
    currentInstallment: number;
    dueDay: number | null;
    startMonthYear: string | null;
    status: string;
    notes: string | null;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {}
) {
  return {
    id: 'debt-1',
    userId: 'user-123',
    name: 'Test Debt',
    creditor: 'Bank',
    totalAmount: '10000',
    isNegotiated: true,
    totalInstallments: 12,
    installmentAmount: '500',
    currentInstallment: 1,
    dueDay: 10,
    startMonthYear: '2024-01',
    status: 'active',
    notes: null,
    currency: 'BRL',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('DebtsRepository', () => {
  let repository: DebtsRepository;
  let mockDatabaseService: {
    schema: { debts: object };
    withUserId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDatabaseService = {
      schema: { debts: {} },
      withUserId: vi.fn(),
    };

    repository = new DebtsRepository(
      mockDatabaseService as unknown as ConstructorParameters<
        typeof DebtsRepository
      >[0]
    );
  });

  describe('getSummary', () => {
    /**
     * Helper to set up mock database to return a list of debts
     */
    function setupMockDebts(debts: ReturnType<typeof createMockDebt>[]) {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(debts),
        }),
      });

      mockDatabaseService.withUserId.mockImplementation(
        async (
          _userId: string,
          callback: (db: unknown) => Promise<unknown>
        ) => {
          return callback({ select: mockSelect });
        }
      );
    }

    describe('KPIs de dividas', () => {
      it('should_calculate_total_amount_as_sum_of_all_debts', async () => {
        setupMockDebts([
          createMockDebt({ totalAmount: '10000' }),
          createMockDebt({ id: 'debt-2', totalAmount: '5000' }),
          createMockDebt({ id: 'debt-3', totalAmount: '3000' }),
        ]);

        const result = await repository.getSummary('user-123');

        expect(result.totalAmount).toBe(18000);
      });

      it('should_calculate_monthly_installment_sum_only_for_active_negotiated', async () => {
        setupMockDebts([
          // Active + negotiated → included
          createMockDebt({
            installmentAmount: '500',
            isNegotiated: true,
            status: 'active',
          }),
          // Active + negotiated → included
          createMockDebt({
            id: 'debt-2',
            installmentAmount: '300',
            isNegotiated: true,
            status: 'active',
          }),
          // Paid off + negotiated → NOT included in monthly sum
          createMockDebt({
            id: 'debt-3',
            installmentAmount: '200',
            isNegotiated: true,
            status: 'paid_off',
          }),
          // Active but NOT negotiated → NOT included
          createMockDebt({
            id: 'debt-4',
            installmentAmount: null,
            isNegotiated: false,
            status: 'active',
          }),
        ]);

        const result = await repository.getSummary('user-123');

        expect(result.monthlyInstallmentSum).toBe(800); // 500 + 300
      });

      it('should_calculate_total_paid_from_paid_installments', async () => {
        setupMockDebts([
          // currentInstallment=4 → paid=3 → 3 * 500 = 1500
          createMockDebt({
            installmentAmount: '500',
            currentInstallment: 4,
            isNegotiated: true,
          }),
          // currentInstallment=7 → paid=6 → 6 * 300 = 1800
          createMockDebt({
            id: 'debt-2',
            installmentAmount: '300',
            currentInstallment: 7,
            isNegotiated: true,
          }),
        ]);

        const result = await repository.getSummary('user-123');

        expect(result.totalPaid).toBe(3300); // 1500 + 1800
      });

      it('should_calculate_total_remaining_as_total_minus_paid', async () => {
        setupMockDebts([
          // totalAmount=10000, currentInstallment=6, installment=500
          // paid = (6-1) * 500 = 2500
          createMockDebt({
            totalAmount: '10000',
            installmentAmount: '500',
            currentInstallment: 6,
            isNegotiated: true,
          }),
          // totalAmount=6000, currentInstallment=3, installment=300
          // paid = (3-1) * 300 = 600
          createMockDebt({
            id: 'debt-2',
            totalAmount: '6000',
            installmentAmount: '300',
            currentInstallment: 3,
            isNegotiated: true,
          }),
        ]);

        const result = await repository.getSummary('user-123');

        // totalAmount = 10000 + 6000 = 16000
        // totalPaid = 2500 + 600 = 3100
        // totalRemaining = 16000 - 3100 = 12900
        expect(result.totalRemaining).toBe(12900);
        expect(result.totalRemaining).toBe(result.totalAmount - result.totalPaid);
      });

      it('should_count_negotiated_debts_correctly', async () => {
        setupMockDebts([
          createMockDebt({ isNegotiated: true }),
          createMockDebt({ id: 'debt-2', isNegotiated: true }),
          createMockDebt({ id: 'debt-3', isNegotiated: false, installmentAmount: null }),
          createMockDebt({ id: 'debt-4', isNegotiated: true }),
        ]);

        const result = await repository.getSummary('user-123');

        expect(result.negotiatedCount).toBe(3);
      });

      it('should_return_zero_values_for_empty_debts_list', async () => {
        setupMockDebts([]);

        const result = await repository.getSummary('user-123');

        expect(result.totalDebts).toBe(0);
        expect(result.totalAmount).toBe(0);
        expect(result.totalPaid).toBe(0);
        expect(result.totalRemaining).toBe(0);
        expect(result.negotiatedCount).toBe(0);
        expect(result.monthlyInstallmentSum).toBe(0);
      });

      it('should_exclude_paid_off_debts_from_monthly_installment_sum', async () => {
        setupMockDebts([
          createMockDebt({
            installmentAmount: '1000',
            isNegotiated: true,
            status: 'active',
          }),
          createMockDebt({
            id: 'debt-2',
            installmentAmount: '500',
            isNegotiated: true,
            status: 'paid_off',
          }),
          createMockDebt({
            id: 'debt-3',
            installmentAmount: '750',
            isNegotiated: true,
            status: 'settled',
          }),
        ]);

        const result = await repository.getSummary('user-123');

        // Only active debts contribute to monthlyInstallmentSum
        expect(result.monthlyInstallmentSum).toBe(1000);
      });

      it('should_include_overdue_debts_in_monthly_installment_sum', async () => {
        setupMockDebts([
          createMockDebt({
            installmentAmount: '1000',
            isNegotiated: true,
            status: 'active',
          }),
          createMockDebt({
            id: 'debt-2',
            installmentAmount: '500',
            isNegotiated: true,
            status: 'overdue',
          }),
        ]);

        const result = await repository.getSummary('user-123');

        // Both active and overdue debts contribute to monthlyInstallmentSum
        expect(result.monthlyInstallmentSum).toBe(1500);
      });

      it('should_count_overdue_debts_in_total', async () => {
        setupMockDebts([
          createMockDebt({ status: 'active' }),
          createMockDebt({ id: 'debt-2', status: 'overdue' }),
          createMockDebt({ id: 'debt-3', status: 'paid_off' }),
        ]);

        const result = await repository.getSummary('user-123');

        expect(result.totalDebts).toBe(3);
      });
    });

    describe('progresso por divida individual', () => {
      it('should_calculate_zero_paid_for_first_installment', async () => {
        // currentInstallment=1 means no installment has been paid yet
        // paidInstallments = 1 - 1 = 0
        setupMockDebts([
          createMockDebt({
            totalAmount: '12000',
            installmentAmount: '1000',
            currentInstallment: 1,
            totalInstallments: 12,
            isNegotiated: true,
          }),
        ]);

        const result = await repository.getSummary('user-123');

        expect(result.totalPaid).toBe(0); // 0 * 1000 = 0
        expect(result.totalRemaining).toBe(12000);
      });

      it('should_calculate_paid_amount_for_mid_installment', async () => {
        // currentInstallment=7 of 12 → paid = 6 installments
        setupMockDebts([
          createMockDebt({
            totalAmount: '12000',
            installmentAmount: '1000',
            currentInstallment: 7,
            totalInstallments: 12,
            isNegotiated: true,
          }),
        ]);

        const result = await repository.getSummary('user-123');

        // paidInstallments = 7 - 1 = 6
        // totalPaid = 6 * 1000 = 6000
        expect(result.totalPaid).toBe(6000);
        expect(result.totalRemaining).toBe(6000); // 12000 - 6000
      });

      it('should_calculate_full_paid_for_last_installment', async () => {
        // currentInstallment=13 of 12 → paid = 12 installments (paid_off)
        setupMockDebts([
          createMockDebt({
            totalAmount: '12000',
            installmentAmount: '1000',
            currentInstallment: 13,
            totalInstallments: 12,
            isNegotiated: true,
            status: 'paid_off',
          }),
        ]);

        const result = await repository.getSummary('user-123');

        // paidInstallments = 13 - 1 = 12
        // totalPaid = 12 * 1000 = 12000
        expect(result.totalPaid).toBe(12000);
        expect(result.totalRemaining).toBe(0); // 12000 - 12000
      });

      it('should_accumulate_paid_across_multiple_debts', async () => {
        setupMockDebts([
          // paid = (4-1) * 200 = 600
          createMockDebt({
            totalAmount: '2400',
            installmentAmount: '200',
            currentInstallment: 4,
            isNegotiated: true,
          }),
          // paid = (10-1) * 150 = 1350
          createMockDebt({
            id: 'debt-2',
            totalAmount: '1800',
            installmentAmount: '150',
            currentInstallment: 10,
            isNegotiated: true,
          }),
          // paid = (2-1) * 500 = 500
          createMockDebt({
            id: 'debt-3',
            totalAmount: '6000',
            installmentAmount: '500',
            currentInstallment: 2,
            isNegotiated: true,
          }),
        ]);

        const result = await repository.getSummary('user-123');

        expect(result.totalPaid).toBe(2450); // 600 + 1350 + 500
      });
    });

    describe('exclusion of non-negotiated debts', () => {
      it('should_include_non_negotiated_debts_in_total_amount', async () => {
        setupMockDebts([
          createMockDebt({
            totalAmount: '10000',
            isNegotiated: true,
            installmentAmount: '500',
          }),
          createMockDebt({
            id: 'debt-2',
            totalAmount: '5000',
            isNegotiated: false,
            installmentAmount: null,
          }),
        ]);

        const result = await repository.getSummary('user-123');

        // Both debts contribute to totalAmount
        expect(result.totalAmount).toBe(15000);
      });

      it('should_not_count_non_negotiated_in_negotiated_count', async () => {
        setupMockDebts([
          createMockDebt({ isNegotiated: true, installmentAmount: '500' }),
          createMockDebt({
            id: 'debt-2',
            isNegotiated: false,
            installmentAmount: null,
          }),
          createMockDebt({
            id: 'debt-3',
            isNegotiated: false,
            installmentAmount: null,
          }),
        ]);

        const result = await repository.getSummary('user-123');

        expect(result.negotiatedCount).toBe(1);
        expect(result.totalDebts).toBe(3);
      });

      it('should_not_add_non_negotiated_to_monthly_installment_sum', async () => {
        setupMockDebts([
          createMockDebt({
            installmentAmount: '800',
            isNegotiated: true,
            status: 'active',
          }),
          createMockDebt({
            id: 'debt-2',
            totalAmount: '20000',
            installmentAmount: null,
            isNegotiated: false,
            status: 'active',
          }),
        ]);

        const result = await repository.getSummary('user-123');

        // Only negotiated debt contributes to monthlyInstallmentSum
        expect(result.monthlyInstallmentSum).toBe(800);
      });

      it('should_not_add_non_negotiated_to_total_paid', async () => {
        setupMockDebts([
          // Negotiated: paid = (5-1) * 400 = 1600
          createMockDebt({
            totalAmount: '4800',
            installmentAmount: '400',
            currentInstallment: 5,
            isNegotiated: true,
          }),
          // Non-negotiated: should NOT contribute to totalPaid
          createMockDebt({
            id: 'debt-2',
            totalAmount: '30000',
            installmentAmount: null,
            currentInstallment: 1,
            isNegotiated: false,
          }),
        ]);

        const result = await repository.getSummary('user-123');

        // Only negotiated debt contributes to totalPaid
        expect(result.totalPaid).toBe(1600);
        // But totalAmount includes both
        expect(result.totalAmount).toBe(34800); // 4800 + 30000
      });
    });
  });
});
