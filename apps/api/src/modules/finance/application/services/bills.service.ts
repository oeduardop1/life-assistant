// apps/api/src/modules/finance/application/services/bills.service.ts

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { AppLoggerService } from '../../../../logger/logger.service';
import type { Bill, NewBill } from '@life-assistant/database';
import {
  BILLS_REPOSITORY,
  type BillsRepositoryPort,
  type BillSearchParams,
} from '../../domain/ports/bills.repository.port';

@Injectable()
export class BillsService {
  constructor(
    @Inject(BILLS_REPOSITORY)
    private readonly repository: BillsRepositoryPort,
    private readonly logger: AppLoggerService
  ) {
    this.logger.setContext(BillsService.name);
  }

  async create(userId: string, data: Omit<NewBill, 'userId'>): Promise<Bill> {
    this.logger.log(`Creating bill for user ${userId}: ${data.name}`);
    const bill = await this.repository.create(userId, data);
    this.logger.log(`Bill created with id ${bill.id}`);
    return bill;
  }

  async findAll(
    userId: string,
    params: BillSearchParams
  ): Promise<{ bills: Bill[]; total: number }> {
    const [bills, total] = await Promise.all([
      this.repository.findByUserId(userId, params),
      this.repository.countByUserId(userId, params),
    ]);
    return { bills, total };
  }

  async findById(userId: string, id: string): Promise<Bill> {
    const bill = await this.repository.findById(userId, id);
    if (!bill) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }
    return bill;
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<NewBill, 'userId'>>
  ): Promise<Bill> {
    this.logger.log(`Updating bill ${id} for user ${userId}`);
    const bill = await this.repository.update(userId, id, data);
    if (!bill) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }
    this.logger.log(`Bill ${id} updated successfully`);
    return bill;
  }

  async delete(userId: string, id: string): Promise<void> {
    this.logger.log(`Deleting bill ${id} for user ${userId}`);
    const deleted = await this.repository.delete(userId, id);
    if (!deleted) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }
    this.logger.log(`Bill ${id} deleted successfully`);
  }

  async markAsPaid(userId: string, id: string): Promise<Bill> {
    this.logger.log(`Marking bill ${id} as paid for user ${userId}`);
    const bill = await this.repository.markAsPaid(userId, id);
    if (!bill) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }
    this.logger.log(`Bill ${id} marked as paid`);
    return bill;
  }

  async markAsUnpaid(userId: string, id: string): Promise<Bill> {
    this.logger.log(`Marking bill ${id} as unpaid for user ${userId}`);
    const bill = await this.repository.markAsUnpaid(userId, id);
    if (!bill) {
      throw new NotFoundException(`Bill with id ${id} not found`);
    }
    this.logger.log(`Bill ${id} marked as unpaid`);
    return bill;
  }

  async sumByMonthYear(userId: string, monthYear: string): Promise<number> {
    return this.repository.sumByMonthYear(userId, monthYear);
  }

  async sumByMonthYearAndStatus(
    userId: string,
    monthYear: string,
    status: string
  ): Promise<number> {
    return this.repository.sumByMonthYearAndStatus(userId, monthYear, status);
  }

  async countByStatus(
    userId: string,
    monthYear: string
  ): Promise<Record<string, number>> {
    return this.repository.countByStatus(userId, monthYear);
  }
}
