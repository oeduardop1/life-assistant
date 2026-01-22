import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import {
  CreateVariableExpenseDto,
  UpdateVariableExpenseDto,
  ExpenseCategoryDto,
} from '../../../../src/modules/finance/presentation/dtos/variable-expense.dto.js';

function createValidCreateExpenseDto(
  overrides: Partial<CreateVariableExpenseDto> = {}
): Record<string, unknown> {
  return {
    name: 'Alimentação',
    category: ExpenseCategoryDto.FOOD,
    expectedAmount: 800,
    monthYear: '2026-01',
    ...overrides,
  };
}

describe('CreateVariableExpenseDto', () => {
  it('should pass with valid data', async () => {
    const dto = plainToInstance(
      CreateVariableExpenseDto,
      createValidCreateExpenseDto()
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with all optional fields provided', async () => {
    const dto = plainToInstance(
      CreateVariableExpenseDto,
      createValidCreateExpenseDto({
        actualAmount: 650,
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
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ expectedAmount: 0 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('expectedAmount');
    });

    it('should reject negative expectedAmount', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ expectedAmount: -100 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('expectedAmount');
    });

    it('should accept expectedAmount = 0.01 (boundary)', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ expectedAmount: 0.01 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-number expectedAmount', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ expectedAmount: 'abc' as unknown as number })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('expectedAmount');
    });
  });

  describe('actualAmount validation', () => {
    it('should accept actualAmount = 0 (has not spent yet)', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ actualAmount: 0 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject negative actualAmount', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ actualAmount: -50 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('actualAmount');
    });

    it('should accept positive actualAmount', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ actualAmount: 500 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept actualAmount greater than expectedAmount', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ expectedAmount: 500, actualAmount: 900 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('monthYear validation', () => {
    it('should accept valid monthYear format (YYYY-MM)', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ monthYear: '2026-03' })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject monthYear without leading zero', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ monthYear: '2026-3' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monthYear');
    });

    it('should reject invalid monthYear format', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ monthYear: 'jan-2026' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monthYear');
    });

    it('should reject monthYear with full date', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ monthYear: '2026-01-01' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monthYear');
    });
  });

  describe('name validation', () => {
    it('should reject empty name', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ name: '' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should reject non-string name', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ name: 42 as unknown as string })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });
  });

  describe('category enum validation', () => {
    it('should accept all valid categories', async () => {
      for (const category of Object.values(ExpenseCategoryDto)) {
        const dto = plainToInstance(
          CreateVariableExpenseDto,
          createValidCreateExpenseDto({ category })
        );
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid category enum', async () => {
      const dto = plainToInstance(
        CreateVariableExpenseDto,
        createValidCreateExpenseDto({ category: 'invalid' as ExpenseCategoryDto })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('category');
    });
  });
});

describe('UpdateVariableExpenseDto', () => {
  it('should pass with empty object (all fields optional)', async () => {
    const dto = plainToInstance(UpdateVariableExpenseDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with valid partial update', async () => {
    const dto = plainToInstance(UpdateVariableExpenseDto, {
      expectedAmount: 1000,
      actualAmount: 800,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject expectedAmount = 0 when provided', async () => {
    const dto = plainToInstance(UpdateVariableExpenseDto, { expectedAmount: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('expectedAmount');
  });

  it('should reject negative expectedAmount when provided', async () => {
    const dto = plainToInstance(UpdateVariableExpenseDto, {
      expectedAmount: -100,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('expectedAmount');
  });

  it('should reject negative actualAmount when provided', async () => {
    const dto = plainToInstance(UpdateVariableExpenseDto, { actualAmount: -50 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('actualAmount');
  });

  it('should accept actualAmount = 0 when provided', async () => {
    const dto = plainToInstance(UpdateVariableExpenseDto, { actualAmount: 0 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject invalid monthYear when provided', async () => {
    const dto = plainToInstance(UpdateVariableExpenseDto, {
      monthYear: 'invalid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('monthYear');
  });

  it('should reject invalid category enum when provided', async () => {
    const dto = plainToInstance(UpdateVariableExpenseDto, {
      category: 'invalid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('category');
  });
});
