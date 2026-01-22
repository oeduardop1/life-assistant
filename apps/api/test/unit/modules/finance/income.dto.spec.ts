import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import {
  CreateIncomeDto,
  UpdateIncomeDto,
  IncomeTypeDto,
  IncomeFrequencyDto,
} from '../../../../src/modules/finance/presentation/dtos/income.dto.js';

function createValidCreateIncomeDto(
  overrides: Partial<CreateIncomeDto> = {}
): Record<string, unknown> {
  return {
    name: 'Salário',
    type: IncomeTypeDto.SALARY,
    frequency: IncomeFrequencyDto.MONTHLY,
    expectedAmount: 5000,
    monthYear: '2026-01',
    ...overrides,
  };
}

describe('CreateIncomeDto', () => {
  it('should pass with valid data', async () => {
    const dto = plainToInstance(CreateIncomeDto, createValidCreateIncomeDto());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with all optional fields provided', async () => {
    const dto = plainToInstance(
      CreateIncomeDto,
      createValidCreateIncomeDto({
        actualAmount: 5200,
        isRecurring: true,
        currency: 'USD',
      })
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  describe('expectedAmount validation', () => {
    it('should reject expectedAmount = 0', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ expectedAmount: 0 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('expectedAmount');
    });

    it('should reject negative expectedAmount', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ expectedAmount: -100 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('expectedAmount');
    });

    it('should accept expectedAmount = 0.01 (boundary)', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ expectedAmount: 0.01 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept large expectedAmount', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ expectedAmount: 999999 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-number expectedAmount', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ expectedAmount: 'abc' as unknown as number })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('expectedAmount');
    });
  });

  describe('monthYear validation', () => {
    it('should accept valid monthYear format (YYYY-MM)', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ monthYear: '2026-01' })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept monthYear with month 12', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ monthYear: '2025-12' })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject monthYear without leading zero (2026-1)', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ monthYear: '2026-1' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monthYear');
    });

    it('should reject monthYear without separator (202601)', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ monthYear: '202601' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monthYear');
    });

    it('should reject monthYear with alphabetic characters', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ monthYear: 'abcd-ef' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monthYear');
    });

    it('should reject monthYear with full date (YYYY-MM-DD)', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ monthYear: '2026-01-15' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monthYear');
    });
  });

  describe('name validation', () => {
    it('should reject empty name', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ name: '' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should reject non-string name', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ name: 123 as unknown as string })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });
  });

  describe('type enum validation', () => {
    it('should accept all valid income types', async () => {
      for (const type of Object.values(IncomeTypeDto)) {
        const dto = plainToInstance(
          CreateIncomeDto,
          createValidCreateIncomeDto({ type })
        );
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid type enum', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ type: 'invalid' as IncomeTypeDto })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('type');
    });
  });

  describe('frequency enum validation', () => {
    it('should accept all valid frequencies', async () => {
      for (const frequency of Object.values(IncomeFrequencyDto)) {
        const dto = plainToInstance(
          CreateIncomeDto,
          createValidCreateIncomeDto({ frequency })
        );
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid frequency enum', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ frequency: 'daily' as IncomeFrequencyDto })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('frequency');
    });
  });

  describe('optional fields', () => {
    it('should accept actualAmount = 0', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ actualAmount: 0 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject negative actualAmount', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ actualAmount: -1 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('actualAmount');
    });

    it('should accept isRecurring boolean', async () => {
      const dto = plainToInstance(
        CreateIncomeDto,
        createValidCreateIncomeDto({ isRecurring: false })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('UpdateIncomeDto', () => {
  it('should pass with empty object (all fields optional)', async () => {
    const dto = plainToInstance(UpdateIncomeDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with valid partial update', async () => {
    const dto = plainToInstance(UpdateIncomeDto, {
      expectedAmount: 6000,
      monthYear: '2026-02',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject expectedAmount = 0 when provided', async () => {
    const dto = plainToInstance(UpdateIncomeDto, { expectedAmount: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('expectedAmount');
  });

  it('should reject negative expectedAmount when provided', async () => {
    const dto = plainToInstance(UpdateIncomeDto, { expectedAmount: -500 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('expectedAmount');
  });

  it('should reject invalid monthYear when provided', async () => {
    const dto = plainToInstance(UpdateIncomeDto, { monthYear: '2026-1' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('monthYear');
  });

  it('should reject invalid type enum when provided', async () => {
    const dto = plainToInstance(UpdateIncomeDto, { type: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('type');
  });

  it('should reject invalid frequency enum when provided', async () => {
    const dto = plainToInstance(UpdateIncomeDto, { frequency: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('frequency');
  });
});
