import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { InvestmentsService } from '../../../../src/modules/finance/application/services/investments.service.js';
import type { Investment } from '@life-assistant/database';
import type { InvestmentSummary } from '../../../../src/modules/finance/domain/ports/investments.repository.port.js';

function createMockInvestment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: 'investment-123',
    userId: 'user-123',
    name: 'Reserva de Emergência',
    type: 'emergency_fund',
    currentAmount: '15000',
    goalAmount: '50000',
    monthlyContribution: '1000',
    deadline: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as Investment;
}

describe('InvestmentsService', () => {
  let service: InvestmentsService;
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    findByUserId: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    countByUserId: ReturnType<typeof vi.fn>;
    updateValue: ReturnType<typeof vi.fn>;
    getSummary: ReturnType<typeof vi.fn>;
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
      updateValue: vi.fn(),
      getSummary: vi.fn(),
    };

    mockLogger = {
      setContext: vi.fn(),
      log: vi.fn(),
    };

    service = new InvestmentsService(
      mockRepository as unknown as ConstructorParameters<typeof InvestmentsService>[0],
      mockLogger as unknown as ConstructorParameters<typeof InvestmentsService>[1]
    );
  });

  describe('create', () => {
    it('should_create_investment_with_valid_data', async () => {
      const mockInvestment = createMockInvestment();
      mockRepository.create.mockResolvedValue(mockInvestment);

      const result = await service.create('user-123', {
        name: 'Reserva de Emergência',
        type: 'emergency_fund',
        currentAmount: '15000',
        goalAmount: '50000',
        monthlyContribution: '1000',
      });

      expect(result).toEqual(mockInvestment);
      expect(mockRepository.create).toHaveBeenCalledWith('user-123', {
        name: 'Reserva de Emergência',
        type: 'emergency_fund',
        currentAmount: '15000',
        goalAmount: '50000',
        monthlyContribution: '1000',
      });
    });
  });

  describe('findAll', () => {
    it('should_return_investments_and_total', async () => {
      const investments = [
        createMockInvestment({ id: 'inv-1' }),
        createMockInvestment({ id: 'inv-2' }),
      ];
      mockRepository.findByUserId.mockResolvedValue(investments);
      mockRepository.countByUserId.mockResolvedValue(2);

      const result = await service.findAll('user-123', {});

      expect(result.investments).toEqual(investments);
      expect(result.total).toBe(2);
    });

    it('should_pass_search_params_to_repository', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);
      mockRepository.countByUserId.mockResolvedValue(0);

      const params = {
        type: 'retirement',
        limit: 10,
        offset: 5,
      };

      await service.findAll('user-123', params);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123', params);
      expect(mockRepository.countByUserId).toHaveBeenCalledWith('user-123', params);
    });

    it('should_return_empty_when_no_investments', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);
      mockRepository.countByUserId.mockResolvedValue(0);

      const result = await service.findAll('user-123', {});

      expect(result.investments).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findById', () => {
    it('should_return_investment_when_found', async () => {
      const mockInvestment = createMockInvestment();
      mockRepository.findById.mockResolvedValue(mockInvestment);

      const result = await service.findById('user-123', 'investment-123');

      expect(result).toEqual(mockInvestment);
      expect(mockRepository.findById).toHaveBeenCalledWith('user-123', 'investment-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.findById('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findById('user-123', 'non-existent')
      ).rejects.toThrow('Investment with id non-existent not found');
    });
  });

  describe('update', () => {
    it('should_update_investment_when_found', async () => {
      const updatedInvestment = createMockInvestment({
        name: 'Aposentadoria',
        type: 'retirement',
      });
      mockRepository.update.mockResolvedValue(updatedInvestment);

      const result = await service.update('user-123', 'investment-123', {
        name: 'Aposentadoria',
        type: 'retirement',
      });

      expect(result).toEqual(updatedInvestment);
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', 'investment-123', {
        name: 'Aposentadoria',
        type: 'retirement',
      });
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(
        service.update('user-123', 'non-existent', { name: 'Test' })
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.update('user-123', 'non-existent', { name: 'Test' })
      ).rejects.toThrow('Investment with id non-existent not found');
    });
  });

  describe('delete', () => {
    it('should_delete_investment_when_found', async () => {
      mockRepository.delete.mockResolvedValue(true);

      await expect(service.delete('user-123', 'investment-123')).resolves.toBeUndefined();
      expect(mockRepository.delete).toHaveBeenCalledWith('user-123', 'investment-123');
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.delete.mockResolvedValue(false);

      await expect(
        service.delete('user-123', 'non-existent')
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.delete('user-123', 'non-existent')
      ).rejects.toThrow('Investment with id non-existent not found');
    });
  });

  describe('updateValue', () => {
    it('should_update_current_amount', async () => {
      const updatedInvestment = createMockInvestment({ currentAmount: '20000' });
      mockRepository.updateValue.mockResolvedValue(updatedInvestment);

      const result = await service.updateValue('user-123', 'investment-123', 20000);

      expect(result).toEqual(updatedInvestment);
      expect(result.currentAmount).toBe('20000');
      expect(mockRepository.updateValue).toHaveBeenCalledWith(
        'user-123',
        'investment-123',
        20000
      );
    });

    it('should_throw_NotFoundException_when_not_found', async () => {
      mockRepository.updateValue.mockResolvedValue(null);

      await expect(
        service.updateValue('user-123', 'non-existent', 20000)
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.updateValue('user-123', 'non-existent', 20000)
      ).rejects.toThrow('Investment with id non-existent not found');
    });
  });

  describe('getSummary', () => {
    it('should_return_investment_summary', async () => {
      const mockSummary: InvestmentSummary = {
        totalInvestments: 3,
        totalCurrentAmount: 45000,
        totalGoalAmount: 150000,
        totalMonthlyContribution: 3000,
        averageProgress: 30,
      };
      mockRepository.getSummary.mockResolvedValue(mockSummary);

      const result = await service.getSummary('user-123');

      expect(result).toEqual(mockSummary);
      expect(mockRepository.getSummary).toHaveBeenCalledWith('user-123');
    });
  });
});
