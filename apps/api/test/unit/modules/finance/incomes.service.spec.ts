import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { IncomesService } from '../../../../src/modules/finance/application/services/incomes.service.js';
import type { Income } from '@life-assistant/database';

function createMockIncome(overrides: Partial<Income> = {}): Income {
  return {
    id: 'income-123',
    userId: 'user-123',
    name: 'Salário',
    type: 'salary',
    frequency: 'monthly',
    expectedAmount: '5000',
    actualAmount: '5000',
    isRecurring: true,
    recurringGroupId: null,
    monthYear: '2024-01',
    currency: 'BRL',
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as Income;
}

describe('IncomesService', () => {
  let service: IncomesService;
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

    service = new IncomesService(
      mockRepository as unknown as ConstructorParameters<typeof IncomesService>[0],
      mockLogger as unknown as ConstructorParameters<typeof IncomesService>[1]
    );
  });

  describe('create', () => {
    it('should_create_income_with_valid_data', async () => {
      const mockIncome = createMockIncome();
      mockRepository.create.mockResolvedValue(mockIncome);

      const result = await service.create('user-123', {
        name: 'Salário',
        type: 'salary',
        frequency: 'monthly',
        expectedAmount: '5000',
        actualAmount: '5000',
        isRecurring: true,
        monthYear: '2024-01',
      });

      expect(result).toEqual(mockIncome);
    });

    it('should_pass_userId_to_repository', async () => {
      const mockIncome = createMockIncome();
      mockRepository.create.mockResolvedValue(mockIncome);

      await service.create('user-456', {
        name: 'Freelance',
        type: 'freelance',
        frequency: 'irregular',
        expectedAmount: '2000',
        monthYear: '2024-02',
      });

      expect(mockRepository.create).toHaveBeenCalledWith('user-456', {
        name: 'Freelance',
        type: 'freelance',
        frequency: 'irregular',
        expectedAmount: '2000',
        monthYear: '2024-02',
      });
    });
  });

  describe('findAll', () => {
    it('should_return_incomes_and_total', async () => {
      const incomes = [
        createMockIncome({ id: 'income-1' }),
        createMockIncome({ id: 'income-2' }),
      ];
      mockRepository.findByUserId.mockResolvedValue(incomes);
      mockRepository.countByUserId.mockResolvedValue(2);

      const result = await service.findAll('user-123', { monthYear: '2024-01' });

      expect(result.incomes).toEqual(incomes);
      expect(result.total).toBe(2);
    });

    it('should_pass_search_params_to_repository', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);
      mockRepository.countByUserId.mockResolvedValue(0);

      const params = {
        monthYear: '2024-03',
        type: 'salary',
        isRecurring: true,
        limit: 10,
        offset: 5,
      };

      await service.findAll('user-123', params);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123', params);
      expect(mockRepository.countByUserId).toHaveBeenCalledWith('user-123', params);
    });

    it('should_return_empty_when_no_incomes', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);
      mockRepository.countByUserId.mockResolvedValue(0);

      const result = await service.findAll('user-123', { monthYear: '2024-01' });

      expect(result.incomes).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findById', () => {
    it('should_return_income_when_found', async () => {
      const mockIncome = createMockIncome();
      mockRepository.findById.mockResolvedValue(mockIncome);

      const result = await service.findById('user-123', 'income-123');

      expect(result).toEqual(mockIncome);
      expect(mockRepository.findById).toHaveBeenCalledWith('user-123', 'income-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.findById('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findById('user-123', 'non-existent')
      ).rejects.toThrow('Income with id non-existent not found');
    });
  });

  describe('update', () => {
    it('should_update_income_when_found', async () => {
      const updatedIncome = createMockIncome({ name: 'Salário Atualizado' });
      mockRepository.update.mockResolvedValue(updatedIncome);

      const result = await service.update('user-123', 'income-123', {
        name: 'Salário Atualizado',
      });

      expect(result).toEqual(updatedIncome);
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'income-123', {
        name: 'Salário Atualizado',
      });
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(
        service.update('user-123', 'non-existent', { name: 'Test' })
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.update('user-123', 'non-existent', { name: 'Test' })
      ).rejects.toThrow('Income with id non-existent not found');
    });
  });

  describe('sumByMonthYear', () => {
    it('should_return_sum_for_expectedAmount', async () => {
      mockRepository.sumByMonthYear.mockResolvedValue(15000);

      const result = await service.sumByMonthYear('user-123', '2024-01', 'expectedAmount');

      expect(result).toBe(15000);
      expect(mockRepository.sumByMonthYear).toHaveBeenCalledWith(
        'user-123',
        '2024-01',
        'expectedAmount'
      );
    });

    it('should_return_sum_for_actualAmount', async () => {
      mockRepository.sumByMonthYear.mockResolvedValue(12000);

      const result = await service.sumByMonthYear('user-123', '2024-01', 'actualAmount');

      expect(result).toBe(12000);
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
      const mockIncome = createMockIncome({ isRecurring: true, recurringGroupId: 'generated-uuid' });
      mockRepository.create.mockResolvedValue(mockIncome);

      await service.create('user-123', {
        name: 'Salário',
        type: 'salary',
        frequency: 'monthly',
        expectedAmount: '5000',
        isRecurring: true,
        monthYear: '2024-01',
      });

      const createCall = mockRepository.create.mock.calls[0]!;
      expect(createCall[1].recurringGroupId).toBeDefined();
      expect(typeof createCall[1].recurringGroupId).toBe('string');
    });

    it('should_not_assign_recurringGroupId_when_isRecurring_is_false', async () => {
      const mockIncome = createMockIncome({ isRecurring: false });
      mockRepository.create.mockResolvedValue(mockIncome);

      await service.create('user-123', {
        name: 'Freelance',
        type: 'freelance',
        frequency: 'irregular',
        expectedAmount: '2000',
        isRecurring: false,
        monthYear: '2024-01',
      });

      const createCall = mockRepository.create.mock.calls[0]!;
      expect(createCall[1].recurringGroupId).toBeUndefined();
    });
  });

  describe('ensureRecurringForMonth', () => {
    it('should_create_entries_from_previous_month_recurring_items', async () => {
      const recurringIncome = createMockIncome({
        id: 'income-jan',
        recurringGroupId: 'group-1',
        isRecurring: true,
        monthYear: '2024-01',
      });

      mockRepository.findRecurringByMonth.mockResolvedValue([recurringIncome]);
      mockRepository.findByRecurringGroupIdAndMonth.mockResolvedValue(null);
      mockRepository.createMany.mockResolvedValue([]);

      await service.ensureRecurringForMonth('user-123', '2024-02');

      expect(mockRepository.findRecurringByMonth).toHaveBeenCalledWith('user-123', '2024-01');
      expect(mockRepository.createMany).toHaveBeenCalledWith('user-123', [
        expect.objectContaining({
          name: 'Salário',
          type: 'salary',
          frequency: 'monthly',
          expectedAmount: '5000',
          recurringGroupId: 'group-1',
          isRecurring: true,
          monthYear: '2024-02',
          actualAmount: null,
        }),
      ]);
    });

    it('should_not_duplicate_if_entry_already_exists', async () => {
      const recurringIncome = createMockIncome({
        recurringGroupId: 'group-1',
        monthYear: '2024-01',
      });

      mockRepository.findRecurringByMonth.mockResolvedValue([recurringIncome]);
      mockRepository.findByRecurringGroupIdAndMonth.mockResolvedValue(
        createMockIncome({ monthYear: '2024-02' })
      );

      await service.ensureRecurringForMonth('user-123', '2024-02');

      expect(mockRepository.createMany).not.toHaveBeenCalled();
    });

    it('should_do_nothing_when_no_recurring_items', async () => {
      mockRepository.findRecurringByMonth.mockResolvedValue([]);

      await service.ensureRecurringForMonth('user-123', '2024-02');

      expect(mockRepository.createMany).not.toHaveBeenCalled();
    });
  });

  describe('updateWithScope', () => {
    it('should_update_only_this_when_scope_is_this', async () => {
      const income = createMockIncome({ recurringGroupId: 'group-1' });
      const updated = createMockIncome({ recurringGroupId: 'group-1', name: 'Novo' });
      mockRepository.findById.mockResolvedValue(income);
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.updateWithScope('user-123', 'income-123', { name: 'Novo' }, 'this');

      expect(result).toEqual(updated);
      expect(mockRepository.updateByRecurringGroupIdAfterMonth).not.toHaveBeenCalled();
    });

    it('should_update_future_when_scope_is_future', async () => {
      const income = createMockIncome({ recurringGroupId: 'group-1', monthYear: '2024-03' });
      const updated = createMockIncome({ recurringGroupId: 'group-1', name: 'Novo', monthYear: '2024-03' });
      mockRepository.findById.mockResolvedValue(income);
      mockRepository.update.mockResolvedValue(updated);
      mockRepository.updateByRecurringGroupIdAfterMonth.mockResolvedValue(2);

      await service.updateWithScope('user-123', 'income-123', { name: 'Novo' }, 'future');

      expect(mockRepository.updateByRecurringGroupIdAfterMonth).toHaveBeenCalledWith(
        'user-123', 'group-1', '2024-03', { name: 'Novo' }
      );
    });

    it('should_update_all_when_scope_is_all', async () => {
      const income = createMockIncome({ recurringGroupId: 'group-1' });
      const allIncomes = [
        createMockIncome({ id: 'i-1', monthYear: '2024-01' }),
        createMockIncome({ id: 'i-2', monthYear: '2024-02' }),
      ];
      mockRepository.findById.mockResolvedValue(income);
      mockRepository.findByRecurringGroupId.mockResolvedValue(allIncomes);
      mockRepository.update.mockResolvedValue(income);

      await service.updateWithScope('user-123', 'income-123', { name: 'Novo' }, 'all');

      expect(mockRepository.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteWithScope', () => {
    it('should_mark_as_excluded_when_scope_is_this', async () => {
      const income = createMockIncome({ recurringGroupId: 'group-1' });
      mockRepository.findById.mockResolvedValue(income);
      mockRepository.update.mockResolvedValue({ ...income, status: 'excluded' });

      await service.deleteWithScope('user-123', 'income-123', 'this');

      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'income-123', { status: 'excluded' });
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should_exclude_current_and_delete_future_when_scope_is_future', async () => {
      const income = createMockIncome({ recurringGroupId: 'group-1', monthYear: '2024-03' });
      mockRepository.findById.mockResolvedValue(income);
      mockRepository.update.mockResolvedValue(createMockIncome({ status: 'excluded', isRecurring: false }));
      mockRepository.deleteByRecurringGroupIdAfterMonth.mockResolvedValue(2);

      await service.deleteWithScope('user-123', 'income-123', 'future');

      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'income-123', { status: 'excluded', isRecurring: false });
      expect(mockRepository.deleteByRecurringGroupIdAfterMonth).toHaveBeenCalledWith(
        'user-123', 'group-1', '2024-03'
      );
    });

    it('should_delete_all_in_group_when_scope_is_all', async () => {
      const income = createMockIncome({ recurringGroupId: 'group-1' });
      mockRepository.findById.mockResolvedValue(income);
      mockRepository.deleteByRecurringGroupId.mockResolvedValue(5);

      await service.deleteWithScope('user-123', 'income-123', 'all');

      expect(mockRepository.deleteByRecurringGroupId).toHaveBeenCalledWith('user-123', 'group-1');
    });

    it('should_mark_as_excluded_when_no_recurringGroupId', async () => {
      const income = createMockIncome({ recurringGroupId: null });
      mockRepository.findById.mockResolvedValue(income);
      mockRepository.update.mockResolvedValue({ ...income, status: 'excluded' });

      await service.deleteWithScope('user-123', 'income-123', 'all');

      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'income-123', { status: 'excluded' });
      expect(mockRepository.deleteByRecurringGroupId).not.toHaveBeenCalled();
    });
  });
});
