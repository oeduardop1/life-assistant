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
    recurringGroupId: null,
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
      markAsPaid: vi.fn(),
      markAsUnpaid: vi.fn(),
      sumByMonthYear: vi.fn(),
      sumByMonthYearAndStatus: vi.fn(),
      countByStatus: vi.fn(),
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
      expect(mockRepository.create).toHaveBeenCalledWith('user-123', expect.objectContaining({
        name: 'Aluguel',
        category: 'housing',
        amount: '1500',
        dueDay: 10,
        isRecurring: true,
        monthYear: '2024-01',
      }));
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

  // ===========================================================================
  // Recurring Methods
  // ===========================================================================

  describe('create (recurring)', () => {
    it('should_assign_recurringGroupId_when_isRecurring_is_true', async () => {
      const mockBill = createMockBill({ isRecurring: true, recurringGroupId: 'generated-uuid' });
      mockRepository.create.mockResolvedValue(mockBill);

      await service.create('user-123', {
        name: 'Aluguel',
        category: 'housing',
        amount: '1500',
        dueDay: 10,
        isRecurring: true,
        monthYear: '2024-01',
      });

      const createCall = mockRepository.create.mock.calls[0]!;
      expect(createCall[1].recurringGroupId).toBeDefined();
      expect(typeof createCall[1].recurringGroupId).toBe('string');
    });

    it('should_not_assign_recurringGroupId_when_isRecurring_is_false', async () => {
      const mockBill = createMockBill({ isRecurring: false });
      mockRepository.create.mockResolvedValue(mockBill);

      await service.create('user-123', {
        name: 'Compra única',
        category: 'other',
        amount: '200',
        dueDay: 15,
        isRecurring: false,
        monthYear: '2024-01',
      });

      const createCall = mockRepository.create.mock.calls[0]!;
      expect(createCall[1].recurringGroupId).toBeUndefined();
    });

    it('should_preserve_existing_recurringGroupId', async () => {
      const mockBill = createMockBill({ isRecurring: true, recurringGroupId: 'existing-group' });
      mockRepository.create.mockResolvedValue(mockBill);

      await service.create('user-123', {
        name: 'Aluguel',
        category: 'housing',
        amount: '1500',
        dueDay: 10,
        isRecurring: true,
        recurringGroupId: 'existing-group',
        monthYear: '2024-01',
      });

      const createCall = mockRepository.create.mock.calls[0]!;
      expect(createCall[1].recurringGroupId).toBe('existing-group');
    });
  });

  describe('ensureRecurringForMonth', () => {
    it('should_create_entries_from_previous_month_recurring_items', async () => {
      const recurringBill = createMockBill({
        id: 'bill-jan',
        recurringGroupId: 'group-1',
        isRecurring: true,
        monthYear: '2024-01',
      });

      mockRepository.findRecurringByMonth.mockResolvedValue([recurringBill]);
      mockRepository.findByRecurringGroupIdAndMonth.mockResolvedValue(null);
      mockRepository.createMany.mockResolvedValue([]);

      await service.ensureRecurringForMonth('user-123', '2024-02');

      expect(mockRepository.findRecurringByMonth).toHaveBeenCalledWith('user-123', '2024-01');
      expect(mockRepository.findByRecurringGroupIdAndMonth).toHaveBeenCalledWith(
        'user-123',
        'group-1',
        '2024-02'
      );
      expect(mockRepository.createMany).toHaveBeenCalledWith('user-123', [
        expect.objectContaining({
          name: 'Aluguel',
          category: 'housing',
          amount: '1500',
          dueDay: 10,
          recurringGroupId: 'group-1',
          isRecurring: true,
          monthYear: '2024-02',
          status: 'pending',
          paidAt: null,
        }),
      ]);
    });

    it('should_not_duplicate_if_entry_already_exists', async () => {
      const recurringBill = createMockBill({
        recurringGroupId: 'group-1',
        isRecurring: true,
        monthYear: '2024-01',
      });
      const existingBill = createMockBill({
        id: 'bill-feb',
        recurringGroupId: 'group-1',
        monthYear: '2024-02',
      });

      mockRepository.findRecurringByMonth.mockResolvedValue([recurringBill]);
      mockRepository.findByRecurringGroupIdAndMonth.mockResolvedValue(existingBill);

      await service.ensureRecurringForMonth('user-123', '2024-02');

      expect(mockRepository.createMany).not.toHaveBeenCalled();
    });

    it('should_do_nothing_when_no_recurring_items_in_previous_month', async () => {
      mockRepository.findRecurringByMonth.mockResolvedValue([]);

      await service.ensureRecurringForMonth('user-123', '2024-02');

      expect(mockRepository.findByRecurringGroupIdAndMonth).not.toHaveBeenCalled();
      expect(mockRepository.createMany).not.toHaveBeenCalled();
    });

    it('should_skip_items_without_recurringGroupId', async () => {
      const billWithoutGroup = createMockBill({
        isRecurring: true,
        recurringGroupId: null,
      });

      mockRepository.findRecurringByMonth.mockResolvedValue([billWithoutGroup]);

      await service.ensureRecurringForMonth('user-123', '2024-02');

      expect(mockRepository.findByRecurringGroupIdAndMonth).not.toHaveBeenCalled();
      expect(mockRepository.createMany).not.toHaveBeenCalled();
    });

    it('should_handle_year_boundary_dec_to_jan', async () => {
      mockRepository.findRecurringByMonth.mockResolvedValue([]);

      await service.ensureRecurringForMonth('user-123', '2025-01');

      expect(mockRepository.findRecurringByMonth).toHaveBeenCalledWith('user-123', '2024-12');
    });

    it('should_generate_even_if_previous_month_bill_is_canceled', async () => {
      const canceledBill = createMockBill({
        status: 'canceled',
        isRecurring: true,
        recurringGroupId: 'group-1',
        monthYear: '2024-01',
      });

      mockRepository.findRecurringByMonth.mockResolvedValue([canceledBill]);
      mockRepository.findByRecurringGroupIdAndMonth.mockResolvedValue(null);
      mockRepository.createMany.mockResolvedValue([]);

      await service.ensureRecurringForMonth('user-123', '2024-02');

      expect(mockRepository.createMany).toHaveBeenCalledWith(
        'user-123',
        [expect.objectContaining({ monthYear: '2024-02', status: 'pending' })]
      );
    });
  });

  describe('findAll (recurring integration)', () => {
    it('should_call_ensureRecurringForMonth_when_monthYear_is_provided', async () => {
      mockRepository.findRecurringByMonth.mockResolvedValue([]);
      mockRepository.findByUserId.mockResolvedValue([]);
      mockRepository.countByUserId.mockResolvedValue(0);

      await service.findAll('user-123', { monthYear: '2024-02' });

      expect(mockRepository.findRecurringByMonth).toHaveBeenCalledWith('user-123', '2024-01');
    });

    it('should_not_call_ensureRecurringForMonth_when_monthYear_is_not_provided', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);
      mockRepository.countByUserId.mockResolvedValue(0);

      await service.findAll('user-123', {});

      expect(mockRepository.findRecurringByMonth).not.toHaveBeenCalled();
    });
  });

  describe('updateWithScope', () => {
    it('should_update_only_this_bill_when_scope_is_this', async () => {
      const bill = createMockBill({ recurringGroupId: 'group-1' });
      const updatedBill = createMockBill({ recurringGroupId: 'group-1', name: 'Novo Nome' });
      mockRepository.findById.mockResolvedValue(bill);
      mockRepository.update.mockResolvedValue(updatedBill);

      const result = await service.updateWithScope('user-123', 'bill-123', { name: 'Novo Nome' }, 'this');

      expect(result).toEqual(updatedBill);
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'bill-123', { name: 'Novo Nome' });
      expect(mockRepository.updateByRecurringGroupIdAfterMonth).not.toHaveBeenCalled();
    });

    it('should_update_this_and_future_when_scope_is_future', async () => {
      const bill = createMockBill({ recurringGroupId: 'group-1', monthYear: '2024-03' });
      const updatedBill = createMockBill({ recurringGroupId: 'group-1', name: 'Novo Nome', monthYear: '2024-03' });
      mockRepository.findById.mockResolvedValue(bill);
      mockRepository.update.mockResolvedValue(updatedBill);
      mockRepository.updateByRecurringGroupIdAfterMonth.mockResolvedValue(2);

      const result = await service.updateWithScope('user-123', 'bill-123', { name: 'Novo Nome' }, 'future');

      expect(result).toEqual(updatedBill);
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'bill-123', { name: 'Novo Nome' });
      expect(mockRepository.updateByRecurringGroupIdAfterMonth).toHaveBeenCalledWith(
        'user-123',
        'group-1',
        '2024-03',
        { name: 'Novo Nome' }
      );
    });

    it('should_update_all_bills_in_group_when_scope_is_all', async () => {
      const bill = createMockBill({ id: 'bill-1', recurringGroupId: 'group-1', monthYear: '2024-03' });
      const allBills = [
        createMockBill({ id: 'bill-1', recurringGroupId: 'group-1', monthYear: '2024-01' }),
        createMockBill({ id: 'bill-2', recurringGroupId: 'group-1', monthYear: '2024-02' }),
        createMockBill({ id: 'bill-3', recurringGroupId: 'group-1', monthYear: '2024-03' }),
      ];
      const updatedBill = createMockBill({ id: 'bill-1', recurringGroupId: 'group-1', name: 'Novo Nome' });

      mockRepository.findById.mockImplementation((_userId: string, id: string) => {
        if (id === 'bill-1') return Promise.resolve(bill);
        return Promise.resolve(updatedBill);
      });
      mockRepository.findByRecurringGroupId.mockResolvedValue(allBills);
      mockRepository.update.mockResolvedValue(updatedBill);

      await service.updateWithScope('user-123', 'bill-1', { name: 'Novo Nome' }, 'all');

      expect(mockRepository.findByRecurringGroupId).toHaveBeenCalledWith('user-123', 'group-1');
      expect(mockRepository.update).toHaveBeenCalledTimes(3);
    });

    it('should_fallback_to_this_scope_when_no_recurringGroupId', async () => {
      const bill = createMockBill({ recurringGroupId: null });
      const updatedBill = createMockBill({ recurringGroupId: null, name: 'Novo' });
      mockRepository.findById.mockResolvedValue(bill);
      mockRepository.update.mockResolvedValue(updatedBill);

      await service.updateWithScope('user-123', 'bill-123', { name: 'Novo' }, 'all');

      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'bill-123', { name: 'Novo' });
      expect(mockRepository.findByRecurringGroupId).not.toHaveBeenCalled();
    });
  });

  describe('deleteWithScope', () => {
    it('should_cancel_bill_when_scope_is_this', async () => {
      const bill = createMockBill({ recurringGroupId: 'group-1' });
      mockRepository.findById.mockResolvedValue(bill);
      mockRepository.update.mockResolvedValue(createMockBill({ status: 'canceled' }));

      await service.deleteWithScope('user-123', 'bill-123', 'this');

      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'bill-123', { status: 'canceled' });
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should_cancel_current_and_delete_future_when_scope_is_future', async () => {
      const bill = createMockBill({ recurringGroupId: 'group-1', monthYear: '2024-03' });
      mockRepository.findById.mockResolvedValue(bill);
      mockRepository.update.mockResolvedValue(createMockBill({ status: 'canceled', isRecurring: false }));
      mockRepository.deleteByRecurringGroupIdAfterMonth.mockResolvedValue(2);

      await service.deleteWithScope('user-123', 'bill-123', 'future');

      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'bill-123', { status: 'canceled', isRecurring: false });
      expect(mockRepository.deleteByRecurringGroupIdAfterMonth).toHaveBeenCalledWith(
        'user-123',
        'group-1',
        '2024-03'
      );
    });

    it('should_delete_all_bills_in_group_when_scope_is_all', async () => {
      const bill = createMockBill({ recurringGroupId: 'group-1' });
      mockRepository.findById.mockResolvedValue(bill);
      mockRepository.deleteByRecurringGroupId.mockResolvedValue(5);

      await service.deleteWithScope('user-123', 'bill-123', 'all');

      expect(mockRepository.deleteByRecurringGroupId).toHaveBeenCalledWith('user-123', 'group-1');
    });

    it('should_cancel_when_no_recurringGroupId_regardless_of_scope', async () => {
      const bill = createMockBill({ recurringGroupId: null });
      mockRepository.findById.mockResolvedValue(bill);
      mockRepository.update.mockResolvedValue(createMockBill({ status: 'canceled' }));

      await service.deleteWithScope('user-123', 'bill-123', 'all');

      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'bill-123', { status: 'canceled' });
      expect(mockRepository.deleteByRecurringGroupId).not.toHaveBeenCalled();
    });
  });
});
