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
    monthYear: '2024-01',
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
    };

    mockLogger = {
      setContext: vi.fn(),
      log: vi.fn(),
    };

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
      expect(mockRepository.create).toHaveBeenCalledWith('user-123', {
        name: 'Alimentação',
        category: 'food',
        expectedAmount: '800',
        actualAmount: '750',
        isRecurring: true,
        monthYear: '2024-01',
      });
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
});
