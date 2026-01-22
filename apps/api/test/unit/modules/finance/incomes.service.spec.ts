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
    monthYear: '2024-01',
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

  describe('delete', () => {
    it('should_delete_income_when_found', async () => {
      mockRepository.delete.mockResolvedValue(true);

      await expect(service.delete('user-123', 'income-123')).resolves.toBeUndefined();
      expect(mockRepository.delete).toHaveBeenCalledWith('user-123', 'income-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.delete.mockResolvedValue(false);

      await expect(
        service.delete('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.delete('user-123', 'non-existent')
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
});
