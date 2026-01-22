import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database package
vi.mock('@life-assistant/database', () => ({
  eq: vi.fn(() => 'eq-result'),
  and: vi.fn((...args: unknown[]) => args),
  count: vi.fn(() => 'count-result'),
}));

import { InvestmentsRepository } from '../../../../src/modules/finance/infrastructure/repositories/investments.repository.js';

/**
 * Create a mock investment for testing calculations
 */
function createMockInvestment(
  overrides: Partial<{
    id: string;
    userId: string;
    name: string;
    type: string;
    goalAmount: string | null;
    currentAmount: string;
    monthlyContribution: string | null;
    deadline: string | null;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {}
) {
  return {
    id: 'inv-1',
    userId: 'user-123',
    name: 'Emergency Fund',
    type: 'emergency_fund',
    goalAmount: '10000',
    currentAmount: '5000',
    monthlyContribution: '500',
    deadline: null,
    currency: 'BRL',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('InvestmentsRepository', () => {
  let repository: InvestmentsRepository;
  let mockDatabaseService: {
    schema: { investments: object };
    withUserId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDatabaseService = {
      schema: { investments: {} },
      withUserId: vi.fn(),
    };

    repository = new InvestmentsRepository(
      mockDatabaseService as unknown as ConstructorParameters<
        typeof InvestmentsRepository
      >[0]
    );
  });

  describe('getSummary', () => {
    /**
     * Helper to set up mock database to return a list of investments
     */
    function setupMockInvestments(
      investments: ReturnType<typeof createMockInvestment>[]
    ) {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(investments),
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

    describe('progresso de investimento', () => {
      it('should_calculate_progress_as_current_div_goal_times_100', async () => {
        // currentAmount=5000, goalAmount=10000 → progress = 50%
        setupMockInvestments([
          createMockInvestment({
            currentAmount: '5000',
            goalAmount: '10000',
          }),
        ]);

        const result = await repository.getSummary('user-123');

        expect(result.averageProgress).toBe(50);
      });

      it('should_calculate_average_progress_across_investments_with_goals', async () => {
        setupMockInvestments([
          // progress = (5000/10000) * 100 = 50%
          createMockInvestment({
            currentAmount: '5000',
            goalAmount: '10000',
          }),
          // progress = (3000/12000) * 100 = 25%
          createMockInvestment({
            id: 'inv-2',
            currentAmount: '3000',
            goalAmount: '12000',
          }),
          // progress = (7500/10000) * 100 = 75%
          createMockInvestment({
            id: 'inv-3',
            currentAmount: '7500',
            goalAmount: '10000',
          }),
        ]);

        const result = await repository.getSummary('user-123');

        // Average = (50 + 25 + 75) / 3 = 50
        expect(result.averageProgress).toBe(50);
      });

      it('should_exclude_investments_without_goal_from_average', async () => {
        setupMockInvestments([
          // progress = (5000/10000) * 100 = 50%
          createMockInvestment({
            currentAmount: '5000',
            goalAmount: '10000',
          }),
          // No goal → should NOT count in average
          createMockInvestment({
            id: 'inv-2',
            currentAmount: '8000',
            goalAmount: null,
          }),
          // progress = (9000/10000) * 100 = 90%
          createMockInvestment({
            id: 'inv-3',
            currentAmount: '9000',
            goalAmount: '10000',
          }),
        ]);

        const result = await repository.getSummary('user-123');

        // Average = (50 + 90) / 2 = 70 (not / 3)
        expect(result.averageProgress).toBe(70);
      });

      it('should_return_zero_average_when_no_investments_have_goals', async () => {
        setupMockInvestments([
          createMockInvestment({
            currentAmount: '5000',
            goalAmount: null,
          }),
          createMockInvestment({
            id: 'inv-2',
            currentAmount: '3000',
            goalAmount: null,
          }),
        ]);

        const result = await repository.getSummary('user-123');

        expect(result.averageProgress).toBe(0);
      });

      it('should_handle_progress_exceeding_100_percent', async () => {
        // currentAmount exceeds goalAmount → progress > 100%
        setupMockInvestments([
          createMockInvestment({
            currentAmount: '15000',
            goalAmount: '10000',
          }),
        ]);

        const result = await repository.getSummary('user-123');

        // progress = (15000/10000) * 100 = 150%
        expect(result.averageProgress).toBe(150);
      });

      it('should_sum_total_current_amount_from_all_investments', async () => {
        setupMockInvestments([
          createMockInvestment({ currentAmount: '5000' }),
          createMockInvestment({ id: 'inv-2', currentAmount: '3000' }),
          createMockInvestment({
            id: 'inv-3',
            currentAmount: '7000',
            goalAmount: null,
          }),
        ]);

        const result = await repository.getSummary('user-123');

        // All investments contribute to totalCurrentAmount regardless of goal
        expect(result.totalCurrentAmount).toBe(15000);
      });

      it('should_sum_total_goal_amount_only_from_investments_with_goals', async () => {
        setupMockInvestments([
          createMockInvestment({ goalAmount: '10000' }),
          createMockInvestment({ id: 'inv-2', goalAmount: '20000' }),
          createMockInvestment({ id: 'inv-3', goalAmount: null }),
        ]);

        const result = await repository.getSummary('user-123');

        // Only investments with goalAmount contribute
        expect(result.totalGoalAmount).toBe(30000);
      });

      it('should_sum_monthly_contributions_only_from_investments_with_contributions', async () => {
        setupMockInvestments([
          createMockInvestment({ monthlyContribution: '500' }),
          createMockInvestment({
            id: 'inv-2',
            monthlyContribution: '1000',
          }),
          createMockInvestment({
            id: 'inv-3',
            monthlyContribution: null,
          }),
        ]);

        const result = await repository.getSummary('user-123');

        expect(result.totalMonthlyContribution).toBe(1500);
      });

      it('should_return_zero_values_for_empty_investments_list', async () => {
        setupMockInvestments([]);

        const result = await repository.getSummary('user-123');

        expect(result.totalInvestments).toBe(0);
        expect(result.totalCurrentAmount).toBe(0);
        expect(result.totalGoalAmount).toBe(0);
        expect(result.totalMonthlyContribution).toBe(0);
        expect(result.averageProgress).toBe(0);
      });

      it('should_count_total_investments_correctly', async () => {
        setupMockInvestments([
          createMockInvestment({ id: 'inv-1' }),
          createMockInvestment({ id: 'inv-2' }),
          createMockInvestment({ id: 'inv-3' }),
          createMockInvestment({ id: 'inv-4', goalAmount: null }),
        ]);

        const result = await repository.getSummary('user-123');

        expect(result.totalInvestments).toBe(4);
      });
    });
  });
});
