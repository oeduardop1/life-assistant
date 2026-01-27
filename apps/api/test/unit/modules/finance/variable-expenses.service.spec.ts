import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { VariableExpensesService } from '../../../../src/modules/finance/application/services/variable-expenses.service.js';
import type { VariableExpense } from '@life-assistant/database';

function createMockExpense(overrides: Partial<VariableExpense> = {}): VariableExpense {
  return {
    id: 'expense-123',
    userId: 'user-123',
    name: 'Alimentação',
    category: 'food',
    expectedAmount: '800',
    actualAmount: '750',
    isRecurring: true,
    recurringGroupId: null,
    monthYear: '2024-01',
    currency: 'BRL',
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as VariableExpense;
}

describe('VariableExpensesService', () => {
  let service: VariableExpensesService;
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    findByUserId: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    countByUserId: ReturnType<typeof vi.fn>;
    sumByMonthYear: ReturnType<typeof vi.fn>;
    findRecurringByMonth: ReturnType<typeof vi.fn>;
    findByRecurringGroupIdAndMonth: ReturnType<typeof vi.fn>;
    findByRecurringGroupId: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    updateByRecurringGroupIdAfterMonth: ReturnType<typeof vi.fn>;
    deleteByRecurringGroupIdAfterMonth: ReturnType<typeof vi.fn>;
    deleteByRecurringGroupId: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    setContext: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      create: vi.fn(),
      findByUserId: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countByUserId: vi.fn(),
      sumByMonthYear: vi.fn(),
      findRecurringByMonth: vi.fn(),
      findByRecurringGroupIdAndMonth: vi.fn(),
      findByRecurringGroupId: vi.fn(),
      createMany: vi.fn(),
      updateByRecurringGroupIdAfterMonth: vi.fn(),
      deleteByRecurringGroupIdAfterMonth: vi.fn(),
      deleteByRecurringGroupId: vi.fn(),
    };

    mockLogger = {
      setContext: vi.fn(),
      log: vi.fn(),
    };

    // Default: no recurring items (prevents ensureRecurringForMonth from throwing)
    mockRepository.findRecurringByMonth.mockResolvedValue([]);

    service = new VariableExpensesService(
      mockRepository as unknown as ConstructorParameters<typeof VariableExpensesService>[0],
      mockLogger as unknown as ConstructorParameters<typeof VariableExpensesService>[1]
    );
  });

  describe('create', () => {
    it('should_create_expense_with_valid_data', async () => {
      const mockExpense = createMockExpense();
      mockRepository.create.mockResolvedValue(mockExpense);

      const result = await service.create('user-123', {
        name: 'Alimentação',
        category: 'food',
        expectedAmount: '800',
        actualAmount: '750',
        isRecurring: true,
        monthYear: '2024-01',
      });

      expect(result).toEqual(mockExpense);
      expect(mockRepository.create).toHaveBeenCalledWith('user-123', expect.objectContaining({
        name: 'Alimentação',
        category: 'food',
        expectedAmount: '800',
        actualAmount: '750',
        isRecurring: true,
        monthYear: '2024-01',
      }));
    });
  });

  describe('findAll', () => {
    it('should_return_expenses_and_total', async () => {
      const expenses = [
        createMockExpense({ id: 'expense-1' }),
        createMockExpense({ id: 'expense-2' }),
      ];
      mockRepository.findByUserId.mockResolvedValue(expenses);
      mockRepository.countByUserId.mockResolvedValue(2);

      const result = await service.findAll('user-123', { monthYear: '2024-01' });

      expect(result.expenses).toEqual(expenses);
      expect(result.total).toBe(2);
    });

    it('should_pass_search_params_to_repository', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);
      mockRepository.countByUserId.mockResolvedValue(0);

      const params = {
        monthYear: '2024-01',
        category: 'transport',
        isRecurring: false,
        limit: 25,
        offset: 10,
      };

      await service.findAll('user-123', params);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123', params);
      expect(mockRepository.countByUserId).toHaveBeenCalledWith('user-123', params);
    });

    it('should_return_empty_when_no_expenses', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);
      mockRepository.countByUserId.mockResolvedValue(0);

      const result = await service.findAll('user-123', { monthYear: '2024-01' });

      expect(result.expenses).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findById', () => {
    it('should_return_expense_when_found', async () => {
      const mockExpense = createMockExpense();
      mockRepository.findById.mockResolvedValue(mockExpense);

      const result = await service.findById('user-123', 'expense-123');

      expect(result).toEqual(mockExpense);
      expect(mockRepository.findById).toHaveBeenCalledWith('user-123', 'expense-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.findById('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findById('user-123', 'non-existent')
      ).rejects.toThrow('Variable expense with id non-existent not found');
    });
  });

  describe('update', () => {
    it('should_update_expense_when_found', async () => {
      const updatedExpense = createMockExpense({ actualAmount: '900' });
      mockRepository.update.mockResolvedValue(updatedExpense);

      const result = await service.update('user-123', 'expense-123', {
        actualAmount: '900',
      });

      expect(result).toEqual(updatedExpense);
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'expense-123', {
        actualAmount: '900',
      });
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(
        service.update('user-123', 'non-existent', { name: 'Test' })
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.update('user-123', 'non-existent', { name: 'Test' })
      ).rejects.toThrow('Variable expense with id non-existent not found');
    });
  });

  describe('delete', () => {
    it('should_delete_expense_when_found', async () => {
      mockRepository.delete.mockResolvedValue(true);

      await expect(service.delete('user-123', 'expense-123')).resolves.toBeUndefined();
      expect(mockRepository.delete).toHaveBeenCalledWith('user-123', 'expense-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.delete.mockResolvedValue(false);

      await expect(
        service.delete('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.delete('user-123', 'non-existent')
      ).rejects.toThrow('Variable expense with id non-existent not found');
    });
  });

  describe('sumByMonthYear', () => {
    it('should_return_sum_for_expectedAmount', async () => {
      mockRepository.sumByMonthYear.mockResolvedValue(3500);

      const result = await service.sumByMonthYear('user-123', '2024-01', 'expectedAmount');

      expect(result).toBe(3500);
      expect(mockRepository.sumByMonthYear).toHaveBeenCalledWith(
        'user-123',
        '2024-01',
        'expectedAmount'
      );
    });

    it('should_return_sum_for_actualAmount', async () => {
      mockRepository.sumByMonthYear.mockResolvedValue(3200);

      const result = await service.sumByMonthYear('user-123', '2024-01', 'actualAmount');

      expect(result).toBe(3200);
      expect(mockRepository.sumByMonthYear).toHaveBeenCalledWith(
        'user-123',
        '2024-01',
        'actualAmount'
      );
    });
  });

  // ===========================================================================
  // Recurring Methods
  // ===========================================================================

  describe('create (recurring)', () => {
    it('should_assign_recurringGroupId_when_isRecurring_is_true', async () => {
      const mockExpense = createMockExpense({ isRecurring: true, recurringGroupId: 'generated-uuid' });
      mockRepository.create.mockResolvedValue(mockExpense);

      await service.create('user-123', {
        name: 'Alimentação',
        category: 'food',
        expectedAmount: '800',
        isRecurring: true,
        monthYear: '2024-01',
      });

      const createCall = mockRepository.create.mock.calls[0]!;
      expect(createCall[1].recurringGroupId).toBeDefined();
      expect(typeof createCall[1].recurringGroupId).toBe('string');
    });

    it('should_not_assign_recurringGroupId_when_isRecurring_is_false', async () => {
      const mockExpense = createMockExpense({ isRecurring: false });
      mockRepository.create.mockResolvedValue(mockExpense);

      await service.create('user-123', {
        name: 'Cinema',
        category: 'entertainment',
        expectedAmount: '50',
        isRecurring: false,
        monthYear: '2024-01',
      });

      const createCall = mockRepository.create.mock.calls[0]!;
      expect(createCall[1].recurringGroupId).toBeUndefined();
    });
  });

  describe('ensureRecurringForMonth', () => {
    it('should_create_entries_from_previous_month', async () => {
      const recurringExpense = createMockExpense({
        id: 'exp-jan',
        recurringGroupId: 'group-1',
        isRecurring: true,
        monthYear: '2024-01',
      });

      mockRepository.findRecurringByMonth.mockResolvedValue([recurringExpense]);
      mockRepository.findByRecurringGroupIdAndMonth.mockResolvedValue(null);
      mockRepository.createMany.mockResolvedValue([]);

      await service.ensureRecurringForMonth('user-123', '2024-02');

      expect(mockRepository.createMany).toHaveBeenCalledWith('user-123', [
        expect.objectContaining({
          name: 'Alimentação',
          category: 'food',
          expectedAmount: '800',
          recurringGroupId: 'group-1',
          isRecurring: true,
          monthYear: '2024-02',
          actualAmount: '0',
        }),
      ]);
    });

    it('should_not_duplicate_if_entry_already_exists', async () => {
      const recurringExpense = createMockExpense({
        recurringGroupId: 'group-1',
        monthYear: '2024-01',
      });

      mockRepository.findRecurringByMonth.mockResolvedValue([recurringExpense]);
      mockRepository.findByRecurringGroupIdAndMonth.mockResolvedValue(
        createMockExpense({ monthYear: '2024-02' })
      );

      await service.ensureRecurringForMonth('user-123', '2024-02');

      expect(mockRepository.createMany).not.toHaveBeenCalled();
    });
  });

  describe('updateWithScope', () => {
    it('should_update_only_this_when_scope_is_this', async () => {
      const expense = createMockExpense({ recurringGroupId: 'group-1' });
      const updated = createMockExpense({ recurringGroupId: 'group-1', name: 'Novo' });
      mockRepository.findById.mockResolvedValue(expense);
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.updateWithScope('user-123', 'expense-123', { name: 'Novo' }, 'this');

      expect(result).toEqual(updated);
      expect(mockRepository.updateByRecurringGroupIdAfterMonth).not.toHaveBeenCalled();
    });

    it('should_update_future_when_scope_is_future', async () => {
      const expense = createMockExpense({ recurringGroupId: 'group-1', monthYear: '2024-03' });
      const updated = createMockExpense({ recurringGroupId: 'group-1', name: 'Novo', monthYear: '2024-03' });
      mockRepository.findById.mockResolvedValue(expense);
      mockRepository.update.mockResolvedValue(updated);
      mockRepository.updateByRecurringGroupIdAfterMonth.mockResolvedValue(2);

      await service.updateWithScope('user-123', 'expense-123', { name: 'Novo' }, 'future');

      expect(mockRepository.updateByRecurringGroupIdAfterMonth).toHaveBeenCalledWith(
        'user-123', 'group-1', '2024-03', { name: 'Novo' }
      );
    });

    it('should_update_all_when_scope_is_all', async () => {
      const expense = createMockExpense({ recurringGroupId: 'group-1' });
      const allExpenses = [
        createMockExpense({ id: 'e-1', monthYear: '2024-01' }),
        createMockExpense({ id: 'e-2', monthYear: '2024-02' }),
      ];
      mockRepository.findById.mockResolvedValue(expense);
      mockRepository.findByRecurringGroupId.mockResolvedValue(allExpenses);
      mockRepository.update.mockResolvedValue(expense);

      await service.updateWithScope('user-123', 'expense-123', { name: 'Novo' }, 'all');

      expect(mockRepository.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteWithScope', () => {
    it('should_mark_as_excluded_when_scope_is_this', async () => {
      const expense = createMockExpense({ recurringGroupId: 'group-1' });
      mockRepository.findById.mockResolvedValue(expense);
      mockRepository.update.mockResolvedValue({ ...expense, status: 'excluded' });

      await service.deleteWithScope('user-123', 'expense-123', 'this');

      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'expense-123', { status: 'excluded' });
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should_stop_recurrence_and_delete_future_when_scope_is_future', async () => {
      const expense = createMockExpense({ recurringGroupId: 'group-1', monthYear: '2024-03' });
      mockRepository.findById.mockResolvedValue(expense);
      mockRepository.update.mockResolvedValue(createMockExpense({ isRecurring: false }));
      mockRepository.deleteByRecurringGroupIdAfterMonth.mockResolvedValue(2);

      await service.deleteWithScope('user-123', 'expense-123', 'future');

      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'expense-123', { isRecurring: false });
      expect(mockRepository.deleteByRecurringGroupIdAfterMonth).toHaveBeenCalledWith(
        'user-123', 'group-1', '2024-03'
      );
    });

    it('should_delete_all_in_group_when_scope_is_all', async () => {
      const expense = createMockExpense({ recurringGroupId: 'group-1' });
      mockRepository.findById.mockResolvedValue(expense);
      mockRepository.deleteByRecurringGroupId.mockResolvedValue(5);

      await service.deleteWithScope('user-123', 'expense-123', 'all');

      expect(mockRepository.deleteByRecurringGroupId).toHaveBeenCalledWith('user-123', 'group-1');
    });

    it('should_mark_as_excluded_when_no_recurringGroupId', async () => {
      const expense = createMockExpense({ recurringGroupId: null });
      mockRepository.findById.mockResolvedValue(expense);
      mockRepository.update.mockResolvedValue({ ...expense, status: 'excluded' });

      await service.deleteWithScope('user-123', 'expense-123', 'all');

      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'expense-123', { status: 'excluded' });
      expect(mockRepository.deleteByRecurringGroupId).not.toHaveBeenCalled();
    });
  });
});
