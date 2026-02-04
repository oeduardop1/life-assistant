import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

import {
  CreateDebtDto,
  UpdateDebtDto,
  NegotiateDebtDto,
  DebtStatusDto,
} from '../../../../src/modules/finance/presentation/dtos/debt.dto.js';
import { DebtsService } from '../../../../src/modules/finance/application/services/debts.service.js';

function createValidNegotiatedDebtDto(
  overrides: Partial<CreateDebtDto> = {}
): Record<string, unknown> {
  return {
    name: 'Financiamento Carro',
    totalAmount: 50000,
    isNegotiated: true,
    totalInstallments: 48,
    installmentAmount: 1200,
    dueDay: 15,
    ...overrides,
  };
}

function createValidNonNegotiatedDebtDto(
  overrides: Partial<CreateDebtDto> = {}
): Record<string, unknown> {
  return {
    name: 'Dívida Cartão',
    totalAmount: 5000,
    isNegotiated: false,
    ...overrides,
  };
}

describe('CreateDebtDto', () => {
  it('should pass with valid negotiated debt data', async () => {
    const dto = plainToInstance(CreateDebtDto, createValidNegotiatedDebtDto());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with valid non-negotiated debt (minimal fields)', async () => {
    const dto = plainToInstance(
      CreateDebtDto,
      createValidNonNegotiatedDebtDto()
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with optional creditor', async () => {
    const dto = plainToInstance(
      CreateDebtDto,
      createValidNegotiatedDebtDto({ creditor: 'Banco XYZ' })
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with optional notes', async () => {
    const dto = plainToInstance(
      CreateDebtDto,
      createValidNegotiatedDebtDto({ notes: 'Renegociação feita em Jan/2026' })
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  describe('totalAmount validation', () => {
    it('should reject totalAmount = 0', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ totalAmount: 0 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('totalAmount');
    });

    it('should reject negative totalAmount', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ totalAmount: -1000 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('totalAmount');
    });

    it('should accept totalAmount = 0.01 (boundary)', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ totalAmount: 0.01 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept large totalAmount', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ totalAmount: 500000 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-number totalAmount', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ totalAmount: 'abc' as unknown as number })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('totalAmount');
    });
  });

  describe('name validation', () => {
    it('should reject empty name', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ name: '' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should reject non-string name', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ name: 123 as unknown as string })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });
  });

  describe('installment fields validation (DTO-level)', () => {
    it('should accept totalInstallments >= 1', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ totalInstallments: 1 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject totalInstallments < 1', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ totalInstallments: 0 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('totalInstallments');
    });

    it('should reject negative totalInstallments', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ totalInstallments: -5 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('totalInstallments');
    });

    it('should reject installmentAmount = 0', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ installmentAmount: 0 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('installmentAmount');
    });

    it('should reject negative installmentAmount', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ installmentAmount: -100 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('installmentAmount');
    });

    it('should accept installmentAmount = 0.01 (boundary)', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ installmentAmount: 0.01 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('dueDay validation', () => {
    it('should reject dueDay < 1 when provided', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ dueDay: 0 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('dueDay');
    });

    it('should reject dueDay > 31 when provided', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ dueDay: 32 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('dueDay');
    });

    it('should accept dueDay = 1 (boundary min)', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ dueDay: 1 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept dueDay = 31 (boundary max)', async () => {
      const dto = plainToInstance(
        CreateDebtDto,
        createValidNegotiatedDebtDto({ dueDay: 31 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('NegotiateDebtDto', () => {
  function createValidNegotiateDto(
    overrides: Partial<NegotiateDebtDto> = {}
  ): Record<string, unknown> {
    return {
      totalInstallments: 24,
      installmentAmount: 500,
      dueDay: 10,
      ...overrides,
    };
  }

  it('should pass with valid data', async () => {
    const dto = plainToInstance(NegotiateDebtDto, createValidNegotiateDto());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  describe('totalInstallments validation', () => {
    it('should reject totalInstallments < 1', async () => {
      const dto = plainToInstance(
        NegotiateDebtDto,
        createValidNegotiateDto({ totalInstallments: 0 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('totalInstallments');
    });

    it('should accept totalInstallments = 1 (boundary)', async () => {
      const dto = plainToInstance(
        NegotiateDebtDto,
        createValidNegotiateDto({ totalInstallments: 1 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept large totalInstallments', async () => {
      const dto = plainToInstance(
        NegotiateDebtDto,
        createValidNegotiateDto({ totalInstallments: 360 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('installmentAmount validation', () => {
    it('should reject installmentAmount = 0', async () => {
      const dto = plainToInstance(
        NegotiateDebtDto,
        createValidNegotiateDto({ installmentAmount: 0 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('installmentAmount');
    });

    it('should reject negative installmentAmount', async () => {
      const dto = plainToInstance(
        NegotiateDebtDto,
        createValidNegotiateDto({ installmentAmount: -200 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('installmentAmount');
    });

    it('should accept installmentAmount = 0.01 (boundary)', async () => {
      const dto = plainToInstance(
        NegotiateDebtDto,
        createValidNegotiateDto({ installmentAmount: 0.01 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('dueDay validation', () => {
    it('should reject dueDay < 1', async () => {
      const dto = plainToInstance(
        NegotiateDebtDto,
        createValidNegotiateDto({ dueDay: 0 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('dueDay');
    });

    it('should reject dueDay > 31', async () => {
      const dto = plainToInstance(
        NegotiateDebtDto,
        createValidNegotiateDto({ dueDay: 32 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('dueDay');
    });

    it('should accept dueDay = 1 (boundary min)', async () => {
      const dto = plainToInstance(
        NegotiateDebtDto,
        createValidNegotiateDto({ dueDay: 1 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept dueDay = 31 (boundary max)', async () => {
      const dto = plainToInstance(
        NegotiateDebtDto,
        createValidNegotiateDto({ dueDay: 31 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('required fields', () => {
    it('should reject missing totalInstallments', async () => {
      const dto = plainToInstance(NegotiateDebtDto, {
        installmentAmount: 500,
        dueDay: 10,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const properties = errors.map((e) => e.property);
      expect(properties).toContain('totalInstallments');
    });

    it('should reject missing installmentAmount', async () => {
      const dto = plainToInstance(NegotiateDebtDto, {
        totalInstallments: 24,
        dueDay: 10,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const properties = errors.map((e) => e.property);
      expect(properties).toContain('installmentAmount');
    });

    it('should reject missing dueDay', async () => {
      const dto = plainToInstance(NegotiateDebtDto, {
        totalInstallments: 24,
        installmentAmount: 500,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const properties = errors.map((e) => e.property);
      expect(properties).toContain('dueDay');
    });
  });
});

describe('Debt Conditional Validation (Service-level)', () => {
  let service: DebtsService;
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    findByUserId: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    payInstallment: ReturnType<typeof vi.fn>;
    negotiate: ReturnType<typeof vi.fn>;
    countByUserId: ReturnType<typeof vi.fn>;
    getSummary: ReturnType<typeof vi.fn>;
  };
  let mockSettingsService: {
    getUserSettings: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    setContext: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      create: vi.fn(),
      findByUserId: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      payInstallment: vi.fn(),
      negotiate: vi.fn(),
      countByUserId: vi.fn(),
      getSummary: vi.fn(),
    };

    mockSettingsService = {
      getUserSettings: vi.fn().mockResolvedValue({ timezone: 'America/Sao_Paulo' }),
    };

    mockLogger = {
      setContext: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    service = new DebtsService(
      mockRepository as unknown as ConstructorParameters<typeof DebtsService>[0],
      mockSettingsService as unknown as ConstructorParameters<typeof DebtsService>[1],
      mockLogger as unknown as ConstructorParameters<typeof DebtsService>[2]
    );
  });

  it('should reject negotiated debt without totalInstallments', async () => {
    await expect(
      service.create('user-123', {
        name: 'Dívida',
        totalAmount: 10000,
        isNegotiated: true,
        installmentAmount: 500,
        dueDay: 15,
        // totalInstallments missing
      } as any)
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create('user-123', {
        name: 'Dívida',
        totalAmount: 10000,
        isNegotiated: true,
        installmentAmount: 500,
        dueDay: 15,
      } as any)
    ).rejects.toThrow(
      'Negotiated debts require totalInstallments, installmentAmount, and dueDay'
    );
  });

  it('should reject negotiated debt without installmentAmount', async () => {
    await expect(
      service.create('user-123', {
        name: 'Dívida',
        totalAmount: 10000,
        isNegotiated: true,
        totalInstallments: 20,
        dueDay: 15,
        // installmentAmount missing
      } as any)
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject negotiated debt without dueDay', async () => {
    await expect(
      service.create('user-123', {
        name: 'Dívida',
        totalAmount: 10000,
        isNegotiated: true,
        totalInstallments: 20,
        installmentAmount: 500,
        // dueDay missing
      } as any)
    ).rejects.toThrow(BadRequestException);
  });

  it('should accept non-negotiated debt without installment fields', async () => {
    const mockDebt = {
      id: 'debt-123',
      userId: 'user-123',
      name: 'Dívida Cartão',
      totalAmount: 5000,
      isNegotiated: false,
    };
    mockRepository.create.mockResolvedValue(mockDebt);

    const result = await service.create('user-123', {
      name: 'Dívida Cartão',
      totalAmount: 5000,
      isNegotiated: false,
    } as any);

    expect(result).toEqual(mockDebt);
    expect(mockRepository.create).toHaveBeenCalled();
  });

  it('should accept negotiated debt with all installment fields', async () => {
    const mockDebt = {
      id: 'debt-123',
      userId: 'user-123',
      name: 'Financiamento',
      totalAmount: 50000,
      isNegotiated: true,
      totalInstallments: 48,
      installmentAmount: 1200,
      dueDay: 15,
      currentInstallment: 1,
    };
    mockRepository.create.mockResolvedValue(mockDebt);

    const result = await service.create('user-123', {
      name: 'Financiamento',
      totalAmount: 50000,
      isNegotiated: true,
      totalInstallments: 48,
      installmentAmount: 1200,
      dueDay: 15,
    } as any);

    expect(result).toEqual(mockDebt);
    expect(mockRepository.create).toHaveBeenCalled();
  });

  describe('payInstallment - currentInstallment range validation', () => {
    it('should reject payInstallment on non-negotiated debt', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'debt-123',
        isNegotiated: false,
        status: 'active',
      });

      await expect(
        service.payInstallment('user-123', 'debt-123')
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.payInstallment('user-123', 'debt-123')
      ).rejects.toThrow('Cannot pay installment on non-negotiated debt');
    });

    it('should reject payInstallment on paid_off debt', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'debt-123',
        isNegotiated: true,
        status: 'paid_off',
        totalInstallments: 12,
        currentInstallment: 13,
      });

      await expect(
        service.payInstallment('user-123', 'debt-123')
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.payInstallment('user-123', 'debt-123')
      ).rejects.toThrow('Debt is already paid off');
    });

    it('should accept payInstallment on active negotiated debt', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'debt-123',
        isNegotiated: true,
        status: 'active',
        totalInstallments: 12,
        currentInstallment: 5,
      });
      mockRepository.payInstallment.mockResolvedValue({
        id: 'debt-123',
        currentInstallment: 6,
        totalInstallments: 12,
        status: 'active',
      });

      const result = await service.payInstallment('user-123', 'debt-123');

      expect(result.currentInstallment).toBe(6);
      expect(mockRepository.payInstallment).toHaveBeenCalledWith(
        'user-123',
        'debt-123',
        1
      );
    });

    it('should reject payInstallment on nonexistent debt', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.payInstallment('user-123', 'nonexistent')
      ).rejects.toThrow('Debt with id nonexistent not found');
    });
  });
});

describe('UpdateDebtDto', () => {
  it('should pass with empty object (all fields optional)', async () => {
    const dto = plainToInstance(UpdateDebtDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with valid partial update', async () => {
    const dto = plainToInstance(UpdateDebtDto, {
      totalAmount: 45000,
      notes: 'Updated notes',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject totalAmount = 0 when provided', async () => {
    const dto = plainToInstance(UpdateDebtDto, { totalAmount: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('totalAmount');
  });

  it('should reject negative totalAmount when provided', async () => {
    const dto = plainToInstance(UpdateDebtDto, { totalAmount: -500 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('totalAmount');
  });

  it('should reject invalid status enum when provided', async () => {
    const dto = plainToInstance(UpdateDebtDto, { status: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('status');
  });

  it('should accept valid status enum values', async () => {
    for (const status of Object.values(DebtStatusDto)) {
      const dto = plainToInstance(UpdateDebtDto, { status });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });
});
