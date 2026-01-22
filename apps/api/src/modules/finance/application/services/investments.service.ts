// apps/api/src/modules/finance/application/services/investments.service.ts

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { AppLoggerService } from '../../../../logger/logger.service';
import type { Investment, NewInvestment } from '@life-assistant/database';
import {
  INVESTMENTS_REPOSITORY,
  type InvestmentsRepositoryPort,
  type InvestmentSearchParams,
  type InvestmentSummary,
} from '../../domain/ports/investments.repository.port';

@Injectable()
export class InvestmentsService {
  constructor(
    @Inject(INVESTMENTS_REPOSITORY)
    private readonly repository: InvestmentsRepositoryPort,
    private readonly logger: AppLoggerService
  ) {
    this.logger.setContext(InvestmentsService.name);
  }

  async create(
    userId: string,
    data: Omit<NewInvestment, 'userId'>
  ): Promise<Investment> {
    this.logger.log(`Creating investment for user ${userId}: ${data.name}`);
    const investment = await this.repository.create(userId, data);
    this.logger.log(`Investment created with id ${investment.id}`);
    return investment;
  }

  async findAll(
    userId: string,
    params: InvestmentSearchParams
  ): Promise<{ investments: Investment[]; total: number }> {
    const [investments, total] = await Promise.all([
      this.repository.findByUserId(userId, params),
      this.repository.countByUserId(userId, params),
    ]);
    return { investments, total };
  }

  async findById(userId: string, id: string): Promise<Investment> {
    const investment = await this.repository.findById(userId, id);
    if (!investment) {
      throw new NotFoundException(`Investment with id ${id} not found`);
    }
    return investment;
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<NewInvestment, 'userId'>>
  ): Promise<Investment> {
    this.logger.log(`Updating investment ${id} for user ${userId}`);
    const investment = await this.repository.update(userId, id, data);
    if (!investment) {
      throw new NotFoundException(`Investment with id ${id} not found`);
    }
    this.logger.log(`Investment ${id} updated successfully`);
    return investment;
  }

  async delete(userId: string, id: string): Promise<void> {
    this.logger.log(`Deleting investment ${id} for user ${userId}`);
    const deleted = await this.repository.delete(userId, id);
    if (!deleted) {
      throw new NotFoundException(`Investment with id ${id} not found`);
    }
    this.logger.log(`Investment ${id} deleted successfully`);
  }

  async updateValue(
    userId: string,
    id: string,
    currentAmount: number
  ): Promise<Investment> {
    this.logger.log(
      `Updating value of investment ${id} to ${String(currentAmount)} for user ${userId}`
    );
    const investment = await this.repository.updateValue(userId, id, currentAmount);
    if (!investment) {
      throw new NotFoundException(`Investment with id ${id} not found`);
    }
    this.logger.log(`Investment ${id} value updated successfully`);
    return investment;
  }

  async getSummary(userId: string): Promise<InvestmentSummary> {
    return this.repository.getSummary(userId);
  }
}
