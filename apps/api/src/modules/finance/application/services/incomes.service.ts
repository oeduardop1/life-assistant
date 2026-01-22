// apps/api/src/modules/finance/application/services/incomes.service.ts

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { AppLoggerService } from '../../../../logger/logger.service';
import type { Income, NewIncome } from '@life-assistant/database';
import {
  INCOMES_REPOSITORY,
  type IncomesRepositoryPort,
  type IncomeSearchParams,
} from '../../domain/ports/incomes.repository.port';

@Injectable()
export class IncomesService {
  constructor(
    @Inject(INCOMES_REPOSITORY)
    private readonly repository: IncomesRepositoryPort,
    private readonly logger: AppLoggerService
  ) {
    this.logger.setContext(IncomesService.name);
  }

  async create(
    userId: string,
    data: Omit<NewIncome, 'userId'>
  ): Promise<Income> {
    this.logger.log(`Creating income for user ${userId}: ${data.name}`);
    const income = await this.repository.create(userId, data);
    this.logger.log(`Income created with id ${income.id}`);
    return income;
  }

  async findAll(
    userId: string,
    params: IncomeSearchParams
  ): Promise<{ incomes: Income[]; total: number }> {
    const [incomes, total] = await Promise.all([
      this.repository.findByUserId(userId, params),
      this.repository.countByUserId(userId, params),
    ]);
    return { incomes, total };
  }

  async findById(userId: string, id: string): Promise<Income> {
    const income = await this.repository.findById(userId, id);
    if (!income) {
      throw new NotFoundException(`Income with id ${id} not found`);
    }
    return income;
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<NewIncome, 'userId'>>
  ): Promise<Income> {
    this.logger.log(`Updating income ${id} for user ${userId}`);
    const income = await this.repository.update(userId, id, data);
    if (!income) {
      throw new NotFoundException(`Income with id ${id} not found`);
    }
    this.logger.log(`Income ${id} updated successfully`);
    return income;
  }

  async delete(userId: string, id: string): Promise<void> {
    this.logger.log(`Deleting income ${id} for user ${userId}`);
    const deleted = await this.repository.delete(userId, id);
    if (!deleted) {
      throw new NotFoundException(`Income with id ${id} not found`);
    }
    this.logger.log(`Income ${id} deleted successfully`);
  }

  async sumByMonthYear(
    userId: string,
    monthYear: string,
    field: 'expectedAmount' | 'actualAmount'
  ): Promise<number> {
    return this.repository.sumByMonthYear(userId, monthYear, field);
  }
}
