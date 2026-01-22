import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import {
  CreateBillDto,
  UpdateBillDto,
  BillCategoryDto,
  BillStatusDto,
} from '../../../../src/modules/finance/presentation/dtos/bill.dto.js';

function createValidCreateBillDto(
  overrides: Partial<CreateBillDto> = {}
): Record<string, unknown> {
  return {
    name: 'Aluguel',
    category: BillCategoryDto.HOUSING,
    amount: 1500,
    dueDay: 10,
    monthYear: '2026-01',
    ...overrides,
  };
}

describe('CreateBillDto', () => {
  it('should pass with valid data', async () => {
    const dto = plainToInstance(CreateBillDto, createValidCreateBillDto());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with all optional fields provided', async () => {
    const dto = plainToInstance(
      CreateBillDto,
      createValidCreateBillDto({
        isRecurring: true,
        currency: 'USD',
      })
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  describe('amount validation', () => {
    it('should reject amount = 0', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ amount: 0 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('amount');
    });

    it('should reject negative amount', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ amount: -100 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('amount');
    });

    it('should accept amount = 0.01 (boundary)', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ amount: 0.01 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept large amount', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ amount: 50000 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-number amount', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ amount: 'abc' as unknown as number })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('amount');
    });
  });

  describe('dueDay validation', () => {
    it('should accept dueDay = 1 (boundary min)', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ dueDay: 1 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept dueDay = 31 (boundary max)', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ dueDay: 31 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept dueDay = 15 (middle)', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ dueDay: 15 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject dueDay = 0', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ dueDay: 0 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('dueDay');
    });

    it('should reject dueDay < 1', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ dueDay: -5 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('dueDay');
    });

    it('should reject dueDay > 31', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ dueDay: 32 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('dueDay');
    });

    it('should reject non-number dueDay', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ dueDay: 'abc' as unknown as number })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('dueDay');
    });
  });

  describe('monthYear validation', () => {
    it('should accept valid monthYear format (YYYY-MM)', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ monthYear: '2026-01' })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject monthYear without leading zero', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ monthYear: '2026-1' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monthYear');
    });

    it('should reject monthYear with full date', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ monthYear: '2026-01-15' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monthYear');
    });

    it('should reject invalid monthYear format', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ monthYear: 'invalid' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monthYear');
    });
  });

  describe('name validation', () => {
    it('should reject empty name', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ name: '' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should reject non-string name', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ name: 123 as unknown as string })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });
  });

  describe('category enum validation', () => {
    it('should accept all valid categories', async () => {
      for (const category of Object.values(BillCategoryDto)) {
        const dto = plainToInstance(
          CreateBillDto,
          createValidCreateBillDto({ category })
        );
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid category enum', async () => {
      const dto = plainToInstance(
        CreateBillDto,
        createValidCreateBillDto({ category: 'invalid' as BillCategoryDto })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('category');
    });
  });
});

describe('UpdateBillDto', () => {
  it('should pass with empty object (all fields optional)', async () => {
    const dto = plainToInstance(UpdateBillDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with valid partial update', async () => {
    const dto = plainToInstance(UpdateBillDto, {
      amount: 2000,
      dueDay: 15,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject amount = 0 when provided', async () => {
    const dto = plainToInstance(UpdateBillDto, { amount: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('amount');
  });

  it('should reject negative amount when provided', async () => {
    const dto = plainToInstance(UpdateBillDto, { amount: -100 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('amount');
  });

  it('should reject dueDay < 1 when provided', async () => {
    const dto = plainToInstance(UpdateBillDto, { dueDay: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('dueDay');
  });

  it('should reject dueDay > 31 when provided', async () => {
    const dto = plainToInstance(UpdateBillDto, { dueDay: 32 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('dueDay');
  });

  it('should reject invalid status enum when provided', async () => {
    const dto = plainToInstance(UpdateBillDto, { status: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('status');
  });

  it('should accept valid status enum', async () => {
    for (const status of Object.values(BillStatusDto)) {
      const dto = plainToInstance(UpdateBillDto, { status });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should reject invalid monthYear when provided', async () => {
    const dto = plainToInstance(UpdateBillDto, { monthYear: '2026-1' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('monthYear');
  });

  it('should reject invalid category enum when provided', async () => {
    const dto = plainToInstance(UpdateBillDto, { category: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('category');
  });
});
