import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { BillsService } from '../../../../src/modules/finance/application/services/bills.service.js';
import type { Bill } from '@life-assistant/database';

function createMockBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'bill-123',
    userId: 'user-123',
    name: 'Aluguel',
    category: 'housing',
    amount: '1500',
    dueDay: 10,
    status: 'pending',
    paidAt: null,
    isRecurring: true,
    monthYear: '2024-01',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as Bill;
}

describe('BillsService', () => {
  let service: BillsService;
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    findByUserId: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    countByUserId: ReturnType<typeof vi.fn>;
    markAsPaid: ReturnType<typeof vi.fn>;
    markAsUnpaid: ReturnType<typeof vi.fn>;
    sumByMonthYear: ReturnType<typeof vi.fn>;
    sumByMonthYearAndStatus: ReturnType<typeof vi.fn>;
    countByStatus: ReturnType<typeof vi.fn>;
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
      markAsPaid: vi.fn(),
      markAsUnpaid: vi.fn(),
      sumByMonthYear: vi.fn(),
      sumByMonthYearAndStatus: vi.fn(),
      countByStatus: vi.fn(),
    };

    mockLogger = {
      setContext: vi.fn(),
      log: vi.fn(),
    };

    service = new BillsService(
      mockRepository as unknown as ConstructorParameters<typeof BillsService>[0],
      mockLogger as unknown as ConstructorParameters<typeof BillsService>[1]
    );
  });

  describe('create', () => {
    it('should_create_bill_with_valid_data', async () => {
      const mockBill = createMockBill();
      mockRepository.create.mockResolvedValue(mockBill);

      const result = await service.create('user-123', {
        name: 'Aluguel',
        category: 'housing',
        amount: '1500',
        dueDay: 10,
        isRecurring: true,
        monthYear: '2024-01',
      });

      expect(result).toEqual(mockBill);
      expect(mockRepository.create).toHaveBeenCalledWith('user-123', {
        name: 'Aluguel',
        category: 'housing',
        amount: '1500',
        dueDay: 10,
        isRecurring: true,
        monthYear: '2024-01',
      });
    });
  });

  describe('findAll', () => {
    it('should_return_bills_and_total', async () => {
      const bills = [
        createMockBill({ id: 'bill-1' }),
        createMockBill({ id: 'bill-2' }),
      ];
      mockRepository.findByUserId.mockResolvedValue(bills);
      mockRepository.countByUserId.mockResolvedValue(2);

      const result = await service.findAll('user-123', { monthYear: '2024-01' });

      expect(result.bills).toEqual(bills);
      expect(result.total).toBe(2);
    });

    it('should_pass_search_params_to_repository', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);
      mockRepository.countByUserId.mockResolvedValue(0);

      const params = {
        monthYear: '2024-01',
        category: 'utilities',
        status: 'pending',
        isRecurring: true,
        limit: 20,
        offset: 0,
      };

      await service.findAll('user-123', params);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123', params);
      expect(mockRepository.countByUserId).toHaveBeenCalledWith('user-123', params);
    });

    it('should_return_empty_when_no_bills', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);
      mockRepository.countByUserId.mockResolvedValue(0);

      const result = await service.findAll('user-123', { monthYear: '2024-01' });

      expect(result.bills).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findById', () => {
    it('should_return_bill_when_found', async () => {
      const mockBill = createMockBill();
      mockRepository.findById.mockResolvedValue(mockBill);

      const result = await service.findById('user-123', 'bill-123');

      expect(result).toEqual(mockBill);
      expect(mockRepository.findById).toHaveBeenCalledWith('user-123', 'bill-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.findById('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findById('user-123', 'non-existent')
      ).rejects.toThrow('Bill with id non-existent not found');
    });
  });

  describe('update', () => {
    it('should_update_bill_when_found', async () => {
      const updatedBill = createMockBill({ name: 'Aluguel Atualizado' });
      mockRepository.update.mockResolvedValue(updatedBill);

      const result = await service.update('user-123', 'bill-123', {
        name: 'Aluguel Atualizado',
      });

      expect(result).toEqual(updatedBill);
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'bill-123', {
        name: 'Aluguel Atualizado',
      });
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(
        service.update('user-123', 'non-existent', { name: 'Test' })
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.update('user-123', 'non-existent', { name: 'Test' })
      ).rejects.toThrow('Bill with id non-existent not found');
    });
  });

  describe('delete', () => {
    it('should_delete_bill_when_found', async () => {
      mockRepository.delete.mockResolvedValue(true);

      await expect(service.delete('user-123', 'bill-123')).resolves.toBeUndefined();
      expect(mockRepository.delete).toHaveBeenCalledWith('user-123', 'bill-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.delete.mockResolvedValue(false);

      await expect(
        service.delete('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.delete('user-123', 'non-existent')
      ).rejects.toThrow('Bill with id non-existent not found');
    });
  });

  describe('markAsPaid', () => {
    it('should_mark_bill_as_paid', async () => {
      const paidBill = createMockBill({
        status: 'paid',
        paidAt: new Date('2024-01-15'),
      });
      mockRepository.markAsPaid.mockResolvedValue(paidBill);

      const result = await service.markAsPaid('user-123', 'bill-123');

      expect(result).toEqual(paidBill);
      expect(result.status).toBe('paid');
      expect(mockRepository.markAsPaid).toHaveBeenCalledWith('user-123', 'bill-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.markAsPaid.mockResolvedValue(null);

      await expect(
        service.markAsPaid('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.markAsPaid('user-123', 'non-existent')
      ).rejects.toThrow('Bill with id non-existent not found');
    });
  });

  describe('markAsUnpaid', () => {
    it('should_mark_bill_as_unpaid', async () => {
      const unpaidBill = createMockBill({
        status: 'pending',
        paidAt: null,
      });
      mockRepository.markAsUnpaid.mockResolvedValue(unpaidBill);

      const result = await service.markAsUnpaid('user-123', 'bill-123');

      expect(result).toEqual(unpaidBill);
      expect(result.status).toBe('pending');
      expect(result.paidAt).toBeNull();
      expect(mockRepository.markAsUnpaid).toHaveBeenCalledWith('user-123', 'bill-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.markAsUnpaid.mockResolvedValue(null);

      await expect(
        service.markAsUnpaid('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.markAsUnpaid('user-123', 'non-existent')
      ).rejects.toThrow('Bill with id non-existent not found');
    });
  });

  describe('sumByMonthYear', () => {
    it('should_return_sum_for_month', async () => {
      mockRepository.sumByMonthYear.mockResolvedValue(4500);

      const result = await service.sumByMonthYear('user-123', '2024-01');

      expect(result).toBe(4500);
      expect(mockRepository.sumByMonthYear).toHaveBeenCalledWith('user-123', '2024-01');
    });
  });

  describe('countByStatus', () => {
    it('should_return_count_by_status', async () => {
      const statusCounts = {
        pending: 3,
        paid: 5,
        overdue: 1,
        canceled: 0,
      };
      mockRepository.countByStatus.mockResolvedValue(statusCounts);

      const result = await service.countByStatus('user-123', '2024-01');

      expect(result).toEqual(statusCounts);
      expect(mockRepository.countByStatus).toHaveBeenCalledWith('user-123', '2024-01');
    });
  });

  describe('sumByMonthYearAndStatus', () => {
    it('should_return_sum_for_month_and_status', async () => {
      mockRepository.sumByMonthYearAndStatus.mockResolvedValue(3500);

      const result = await service.sumByMonthYearAndStatus('user-123', '2024-01', 'paid');

      expect(result).toBe(3500);
      expect(mockRepository.sumByMonthYearAndStatus).toHaveBeenCalledWith(
        'user-123',
        '2024-01',
        'paid'
      );
    });

    it('should_return_zero_when_no_bills_match', async () => {
      mockRepository.sumByMonthYearAndStatus.mockResolvedValue(0);

      const result = await service.sumByMonthYearAndStatus('user-123', '2024-01', 'paid');

      expect(result).toBe(0);
    });
  });
});
