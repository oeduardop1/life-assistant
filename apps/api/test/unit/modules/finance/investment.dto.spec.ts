import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import {
  CreateInvestmentDto,
  UpdateInvestmentDto,
  UpdateInvestmentValueDto,
  InvestmentTypeDto,
} from '../../../../src/modules/finance/presentation/dtos/investment.dto.js';

function createValidCreateInvestmentDto(
  overrides: Partial<CreateInvestmentDto> = {}
): Record<string, unknown> {
  return {
    name: 'Reserva de Emergência',
    type: InvestmentTypeDto.EMERGENCY_FUND,
    ...overrides,
  };
}

describe('CreateInvestmentDto', () => {
  it('should pass with minimal valid data (name + type)', async () => {
    const dto = plainToInstance(
      CreateInvestmentDto,
      createValidCreateInvestmentDto()
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with all optional fields provided', async () => {
    const dto = plainToInstance(
      CreateInvestmentDto,
      createValidCreateInvestmentDto({
        goalAmount: 30000,
        currentAmount: 15000,
        monthlyContribution: 1000,
        deadline: '2027-12-31',
        currency: 'USD',
      })
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  describe('currentAmount validation', () => {
    it('should accept currentAmount = 0 (just started)', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ currentAmount: 0 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject negative currentAmount', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ currentAmount: -100 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('currentAmount');
    });

    it('should accept positive currentAmount', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ currentAmount: 10000 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('goalAmount validation', () => {
    it('should accept goalAmount > 0 when provided', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ goalAmount: 50000 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept goalAmount = 0 when provided (>= 0)', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ goalAmount: 0 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject negative goalAmount', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ goalAmount: -1000 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('goalAmount');
    });

    it('should accept goalAmount not provided (optional)', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto()
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('monthlyContribution validation', () => {
    it('should accept monthlyContribution = 0', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ monthlyContribution: 0 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject negative monthlyContribution', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ monthlyContribution: -500 })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monthlyContribution');
    });

    it('should accept positive monthlyContribution', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ monthlyContribution: 1500 })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('deadline validation', () => {
    it('should accept valid ISO date string', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ deadline: '2027-12-31' })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept full ISO datetime string', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ deadline: '2027-12-31T00:00:00.000Z' })
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid date format', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ deadline: 'invalid-date' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('deadline');
    });

    it('should reject non-ISO date format (DD/MM/YYYY)', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ deadline: '31/12/2027' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('deadline');
    });
  });

  describe('name validation', () => {
    it('should reject empty name', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ name: '' })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should reject non-string name', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ name: 123 as unknown as string })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });
  });

  describe('type enum validation', () => {
    it('should accept all valid investment types', async () => {
      for (const type of Object.values(InvestmentTypeDto)) {
        const dto = plainToInstance(
          CreateInvestmentDto,
          createValidCreateInvestmentDto({ type })
        );
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid type enum', async () => {
      const dto = plainToInstance(
        CreateInvestmentDto,
        createValidCreateInvestmentDto({ type: 'invalid' as InvestmentTypeDto })
      );
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('type');
    });
  });
});

describe('UpdateInvestmentDto', () => {
  it('should pass with empty object (all fields optional)', async () => {
    const dto = plainToInstance(UpdateInvestmentDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with valid partial update', async () => {
    const dto = plainToInstance(UpdateInvestmentDto, {
      goalAmount: 40000,
      monthlyContribution: 2000,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject negative currentAmount when provided', async () => {
    const dto = plainToInstance(UpdateInvestmentDto, { currentAmount: -100 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('currentAmount');
  });

  it('should reject negative goalAmount when provided', async () => {
    const dto = plainToInstance(UpdateInvestmentDto, { goalAmount: -500 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('goalAmount');
  });

  it('should reject negative monthlyContribution when provided', async () => {
    const dto = plainToInstance(UpdateInvestmentDto, {
      monthlyContribution: -200,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('monthlyContribution');
  });

  it('should reject invalid type enum when provided', async () => {
    const dto = plainToInstance(UpdateInvestmentDto, { type: 'invalid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('type');
  });

  it('should reject invalid deadline format when provided', async () => {
    const dto = plainToInstance(UpdateInvestmentDto, { deadline: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('deadline');
  });
});

describe('UpdateInvestmentValueDto', () => {
  it('should pass with currentAmount >= 0', async () => {
    const dto = plainToInstance(UpdateInvestmentValueDto, {
      currentAmount: 16500,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept currentAmount = 0', async () => {
    const dto = plainToInstance(UpdateInvestmentValueDto, {
      currentAmount: 0,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject negative currentAmount', async () => {
    const dto = plainToInstance(UpdateInvestmentValueDto, {
      currentAmount: -100,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('currentAmount');
  });

  it('should reject missing currentAmount', async () => {
    const dto = plainToInstance(UpdateInvestmentValueDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('currentAmount');
  });

  it('should reject non-number currentAmount', async () => {
    const dto = plainToInstance(UpdateInvestmentValueDto, {
      currentAmount: 'abc',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('currentAmount');
  });
});
