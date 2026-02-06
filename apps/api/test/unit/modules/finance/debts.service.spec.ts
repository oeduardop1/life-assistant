import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { DebtsService } from '../../../../src/modules/finance/application/services/debts.service.js';
import type { Debt } from '@life-assistant/database';
import type { DebtSummary } from '../../../../src/modules/finance/domain/ports/debts.repository.port.js';

function createMockDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: 'debt-123',
    userId: 'user-123',
    name: 'Carro',
    creditor: 'Banco XYZ',
    totalAmount: '30000',
    isNegotiated: true,
    totalInstallments: 48,
    installmentAmount: '750',
    currentInstallment: 5,
    dueDay: 15,
    startMonthYear: '2024-01',
    status: 'active',
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as Debt;
}

describe('DebtsService', () => {
  let service: DebtsService;
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    findByUserId: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    countByUserId: ReturnType<typeof vi.fn>;
    payInstallment: ReturnType<typeof vi.fn>;
    negotiate: ReturnType<typeof vi.fn>;
    getSummary: ReturnType<typeof vi.fn>;
    sumPaymentsByMonthYear: ReturnType<typeof vi.fn>;
  };
  let mockSettingsService: {
    getUserSettings: ReturnType<typeof vi.fn>;
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
      payInstallment: vi.fn(),
      negotiate: vi.fn(),
      getSummary: vi.fn(),
      sumPaymentsByMonthYear: vi.fn(),
    };

    mockSettingsService = {
      getUserSettings: vi.fn().mockResolvedValue({ timezone: 'America/Sao_Paulo' }),
    };

    mockLogger = {
      setContext: vi.fn(),
      log: vi.fn(),
    };

    service = new DebtsService(
      mockRepository as unknown as ConstructorParameters<typeof DebtsService>[0],
      mockSettingsService as unknown as ConstructorParameters<typeof DebtsService>[1],
      mockLogger as unknown as ConstructorParameters<typeof DebtsService>[2]
    );
  });

  describe('create', () => {
    it('should_create_debt_with_valid_negotiated_data', async () => {
      const mockDebt = createMockDebt();
      mockRepository.create.mockResolvedValue(mockDebt);

      const result = await service.create('user-123', {
        name: 'Carro',
        creditor: 'Banco XYZ',
        totalAmount: '30000',
        isNegotiated: true,
        totalInstallments: 48,
        installmentAmount: '750',
        dueDay: 15,
      });

      expect(result).toEqual(mockDebt);
      expect(mockRepository.create).toHaveBeenCalledWith('user-123', {
        name: 'Carro',
        creditor: 'Banco XYZ',
        totalAmount: '30000',
        isNegotiated: true,
        totalInstallments: 48,
        installmentAmount: '750',
        dueDay: 15,
      });
    });

    it('should_create_non_negotiated_debt', async () => {
      const mockDebt = createMockDebt({
        isNegotiated: false,
        totalInstallments: null,
        installmentAmount: null,
        dueDay: null,
      });
      mockRepository.create.mockResolvedValue(mockDebt);

      const result = await service.create('user-123', {
        name: 'Cartão de Crédito',
        totalAmount: '5000',
        isNegotiated: false,
      });

      expect(result).toEqual(mockDebt);
    });

    it('should_throw_BadRequestException_when_negotiated_without_totalInstallments', async () => {
      await expect(
        service.create('user-123', {
          name: 'Test',
          totalAmount: '10000',
          isNegotiated: true,
          installmentAmount: '500',
          dueDay: 10,
          // totalInstallments missing
        })
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create('user-123', {
          name: 'Test',
          totalAmount: '10000',
          isNegotiated: true,
          installmentAmount: '500',
          dueDay: 10,
        })
      ).rejects.toThrow(
        'Negotiated debts require totalInstallments, installmentAmount, and dueDay'
      );
    });

    it('should_throw_BadRequestException_when_negotiated_without_installmentAmount', async () => {
      await expect(
        service.create('user-123', {
          name: 'Test',
          totalAmount: '10000',
          isNegotiated: true,
          totalInstallments: 20,
          dueDay: 10,
          // installmentAmount missing
        })
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create('user-123', {
          name: 'Test',
          totalAmount: '10000',
          isNegotiated: true,
          totalInstallments: 20,
          dueDay: 10,
        })
      ).rejects.toThrow(
        'Negotiated debts require totalInstallments, installmentAmount, and dueDay'
      );
    });

    it('should_throw_BadRequestException_when_negotiated_without_dueDay', async () => {
      await expect(
        service.create('user-123', {
          name: 'Test',
          totalAmount: '10000',
          isNegotiated: true,
          totalInstallments: 20,
          installmentAmount: '500',
          // dueDay missing
        })
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create('user-123', {
          name: 'Test',
          totalAmount: '10000',
          isNegotiated: true,
          totalInstallments: 20,
          installmentAmount: '500',
        })
      ).rejects.toThrow(
        'Negotiated debts require totalInstallments, installmentAmount, and dueDay'
      );
    });
  });

  describe('findAll', () => {
    it('should_return_debts_and_total', async () => {
      const debts = [
        createMockDebt({ id: 'debt-1' }),
        createMockDebt({ id: 'debt-2' }),
      ];
      mockRepository.findByUserId.mockResolvedValue(debts);
      mockRepository.countByUserId.mockResolvedValue(2);

      const result = await service.findAll('user-123', {});

      expect(result.debts).toEqual(debts);
      expect(result.total).toBe(2);
    });

    it('should_pass_search_params_to_repository', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);
      mockRepository.countByUserId.mockResolvedValue(0);

      const params = {
        status: 'active',
        isNegotiated: true,
        limit: 10,
        offset: 0,
      };

      await service.findAll('user-123', params);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123', params);
      expect(mockRepository.countByUserId).toHaveBeenCalledWith('user-123', params);
    });
  });

  describe('findById', () => {
    it('should_return_debt_when_found', async () => {
      const mockDebt = createMockDebt();
      mockRepository.findById.mockResolvedValue(mockDebt);

      const result = await service.findById('user-123', 'debt-123');

      expect(result).toEqual(mockDebt);
      expect(mockRepository.findById).toHaveBeenCalledWith('user-123', 'debt-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.findById('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findById('user-123', 'non-existent')
      ).rejects.toThrow('Debt with id non-existent not found');
    });
  });

  describe('update', () => {
    it('should_update_debt_when_found', async () => {
      const updatedDebt = createMockDebt({ name: 'Carro Atualizado' });
      mockRepository.update.mockResolvedValue(updatedDebt);

      const result = await service.update('user-123', 'debt-123', {
        name: 'Carro Atualizado',
      });

      expect(result).toEqual(updatedDebt);
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'debt-123', {
        name: 'Carro Atualizado',
      });
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(
        service.update('user-123', 'non-existent', { name: 'Test' })
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.update('user-123', 'non-existent', { name: 'Test' })
      ).rejects.toThrow('Debt with id non-existent not found');
    });
  });

  describe('delete', () => {
    it('should_delete_debt_when_found', async () => {
      mockRepository.delete.mockResolvedValue(true);

      await expect(service.delete('user-123', 'debt-123')).resolves.toBeUndefined();
      expect(mockRepository.delete).toHaveBeenCalledWith('user-123', 'debt-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.delete.mockResolvedValue(false);

      await expect(
        service.delete('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.delete('user-123', 'non-existent')
      ).rejects.toThrow('Debt with id non-existent not found');
    });
  });

  describe('payInstallment', () => {
    it('should_pay_installment_when_negotiated_and_active', async () => {
      const existingDebt = createMockDebt({
        isNegotiated: true,
        status: 'active',
        currentInstallment: 5,
      });
      const paidDebt = createMockDebt({
        currentInstallment: 6,
      });

      mockRepository.findById.mockResolvedValue(existingDebt);
      mockRepository.payInstallment.mockResolvedValue(paidDebt);

      const result = await service.payInstallment('user-123', 'debt-123');

      expect(result).toEqual(paidDebt);
      expect(result.currentInstallment).toBe(6);
      expect(mockRepository.payInstallment).toHaveBeenCalledWith('user-123', 'debt-123', 1);
    });

    it('should_throw_NotFoundException_when_debt_not_found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.payInstallment('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.payInstallment('user-123', 'non-existent')
      ).rejects.toThrow('Debt with id non-existent not found');
    });

    it('should_throw_BadRequestException_when_not_negotiated', async () => {
      const nonNegotiatedDebt = createMockDebt({
        isNegotiated: false,
        status: 'active',
      });
      mockRepository.findById.mockResolvedValue(nonNegotiatedDebt);

      await expect(
        service.payInstallment('user-123', 'debt-123')
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.payInstallment('user-123', 'debt-123')
      ).rejects.toThrow('Cannot pay installment on non-negotiated debt');
    });

    it('should_throw_BadRequestException_when_already_paid_off', async () => {
      const paidOffDebt = createMockDebt({
        isNegotiated: true,
        status: 'paid_off',
      });
      mockRepository.findById.mockResolvedValue(paidOffDebt);

      await expect(
        service.payInstallment('user-123', 'debt-123')
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.payInstallment('user-123', 'debt-123')
      ).rejects.toThrow('Debt is already paid off');
    });

    it('should_pay_multiple_installments_at_once', async () => {
      const existingDebt = createMockDebt({
        isNegotiated: true,
        status: 'active',
        currentInstallment: 3,
        totalInstallments: 12,
      });
      const paidDebt = createMockDebt({
        currentInstallment: 6,
      });

      mockRepository.findById.mockResolvedValue(existingDebt);
      mockRepository.payInstallment.mockResolvedValue(paidDebt);

      const result = await service.payInstallment('user-123', 'debt-123', 3);

      expect(result.currentInstallment).toBe(6);
      expect(mockRepository.payInstallment).toHaveBeenCalledWith('user-123', 'debt-123', 3);
    });

    it('should_allow_paying_overdue_debt', async () => {
      const overdueDebt = createMockDebt({
        isNegotiated: true,
        status: 'overdue',
        currentInstallment: 2,
      });
      const paidDebt = createMockDebt({
        currentInstallment: 3,
        status: 'active',
      });

      mockRepository.findById.mockResolvedValue(overdueDebt);
      mockRepository.payInstallment.mockResolvedValue(paidDebt);

      const result = await service.payInstallment('user-123', 'debt-123', 1);

      expect(result).toEqual(paidDebt);
      expect(mockRepository.payInstallment).toHaveBeenCalledWith('user-123', 'debt-123', 1);
    });
  });

  describe('negotiate', () => {
    it('should_negotiate_debt_with_valid_data', async () => {
      const existingDebt = createMockDebt({
        isNegotiated: false,
        totalInstallments: null,
        installmentAmount: null,
        dueDay: null,
      });
      const negotiatedDebt = createMockDebt({
        isNegotiated: true,
        totalInstallments: 24,
        installmentAmount: '500',
        dueDay: 20,
        currentInstallment: 1,
      });

      mockRepository.findById.mockResolvedValue(existingDebt);
      mockRepository.negotiate.mockResolvedValue(negotiatedDebt);

      const result = await service.negotiate('user-123', 'debt-123', {
        totalInstallments: 24,
        installmentAmount: 500,
        dueDay: 20,
      });

      expect(result).toEqual(negotiatedDebt);
      expect(result.isNegotiated).toBe(true);
      expect(mockRepository.negotiate).toHaveBeenCalledWith('user-123', 'debt-123', {
        totalInstallments: 24,
        installmentAmount: 500,
        dueDay: 20,
      });
    });

    it('should_negotiate_debt_with_startMonthYear', async () => {
      const existingDebt = createMockDebt({
        isNegotiated: false,
        totalInstallments: null,
        installmentAmount: null,
        dueDay: null,
        startMonthYear: null,
      });
      const negotiatedDebt = createMockDebt({
        isNegotiated: true,
        totalInstallments: 12,
        installmentAmount: '400',
        dueDay: 15,
        startMonthYear: '2026-03',
        currentInstallment: 1,
      });

      mockRepository.findById.mockResolvedValue(existingDebt);
      mockRepository.negotiate.mockResolvedValue(negotiatedDebt);

      const result = await service.negotiate('user-123', 'debt-123', {
        totalInstallments: 12,
        installmentAmount: 400,
        dueDay: 15,
        startMonthYear: '2026-03',
      });

      expect(result).toEqual(negotiatedDebt);
      expect(result.startMonthYear).toBe('2026-03');
      expect(mockRepository.negotiate).toHaveBeenCalledWith('user-123', 'debt-123', {
        totalInstallments: 12,
        installmentAmount: 400,
        dueDay: 15,
        startMonthYear: '2026-03',
      });
    });

    it('should_throw_NotFoundException_when_debt_not_found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.negotiate('user-123', 'non-existent', {
          totalInstallments: 24,
          installmentAmount: 500,
          dueDay: 20,
        })
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.negotiate('user-123', 'non-existent', {
          totalInstallments: 24,
          installmentAmount: 500,
          dueDay: 20,
        })
      ).rejects.toThrow('Debt with id non-existent not found');
    });

    it('should_throw_BadRequestException_when_already_negotiated', async () => {
      const alreadyNegotiated = createMockDebt({ isNegotiated: true });
      mockRepository.findById.mockResolvedValue(alreadyNegotiated);

      await expect(
        service.negotiate('user-123', 'debt-123', {
          totalInstallments: 24,
          installmentAmount: 500,
          dueDay: 20,
        })
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.negotiate('user-123', 'debt-123', {
          totalInstallments: 24,
          installmentAmount: 500,
          dueDay: 20,
        })
      ).rejects.toThrow('Debt is already negotiated');
    });
  });

  describe('getSummary', () => {
    it('should_return_debt_summary', async () => {
      const mockSummary: DebtSummary = {
        totalDebts: 3,
        totalAmount: 50000,
        totalPaid: 10000,
        totalRemaining: 40000,
        negotiatedCount: 2,
        monthlyInstallmentSum: 1500,
      };
      mockRepository.getSummary.mockResolvedValue(mockSummary);

      const result = await service.getSummary('user-123');

      expect(result).toEqual(mockSummary);
      expect(mockRepository.getSummary).toHaveBeenCalledWith('user-123', undefined);
    });
  });

  describe('sumPaymentsByMonthYear', () => {
    it('should_return_sum_of_payments_for_month', async () => {
      mockRepository.sumPaymentsByMonthYear.mockResolvedValue(1500);

      const result = await service.sumPaymentsByMonthYear('user-123', '2024-03');

      expect(result).toBe(1500);
      expect(mockRepository.sumPaymentsByMonthYear).toHaveBeenCalledWith(
        'user-123',
        '2024-03'
      );
    });

    it('should_return_zero_when_no_payments_in_month', async () => {
      mockRepository.sumPaymentsByMonthYear.mockResolvedValue(0);

      const result = await service.sumPaymentsByMonthYear('user-123', '2024-06');

      expect(result).toBe(0);
      expect(mockRepository.sumPaymentsByMonthYear).toHaveBeenCalledWith(
        'user-123',
        '2024-06'
      );
    });
  });
});
