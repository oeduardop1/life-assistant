// apps/api/src/modules/finance/presentation/controllers/bills.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../common/types/request.types';
import { BillsService } from '../../application/services/bills.service';
import { CreateBillDto, UpdateBillDto } from '../dtos/bill.dto';
import { BillQueryDto } from '../dtos/query.dto';
import { ScopeQueryDto } from '../dtos/scope-query.dto';

@ApiTags('Finance - Bills')
@ApiBearerAuth()
@Controller('finance/bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new bill' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Bill created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBillDto
  ) {
    const bill = await this.billsService.create(user.id, {
      name: dto.name,
      category: dto.category,
      amount: dto.amount.toString(),
      dueDay: dto.dueDay,
      isRecurring: dto.isRecurring ?? true,
      monthYear: dto.monthYear,
      currency: dto.currency ?? 'BRL',
    });
    return { bill };
  }

  @Get()
  @ApiOperation({ summary: 'List bills' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of bills' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BillQueryDto
  ) {
    const { bills, total } = await this.billsService.findAll(user.id, {
      monthYear: query.monthYear,
      category: query.category,
      status: query.status,
      isRecurring: query.isRecurring,
      limit: query.limit,
      offset: query.offset,
    });
    return { bills, total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bill by ID' })
  @ApiParam({ name: 'id', description: 'Bill ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bill found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bill not found' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const bill = await this.billsService.findById(user.id, id);
    return { bill };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bill' })
  @ApiParam({ name: 'id', description: 'Bill ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bill updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bill not found' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBillDto,
    @Query() scopeQuery: ScopeQueryDto
  ) {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.amount !== undefined) updateData.amount = dto.amount.toString();
    if (dto.dueDay !== undefined) updateData.dueDay = dto.dueDay;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.isRecurring !== undefined) updateData.isRecurring = dto.isRecurring;
    if (dto.monthYear !== undefined) updateData.monthYear = dto.monthYear;
    if (dto.currency !== undefined) updateData.currency = dto.currency;

    const bill = await this.billsService.updateWithScope(
      user.id,
      id,
      updateData,
      scopeQuery.scope ?? 'this'
    );
    return { bill };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete bill' })
  @ApiParam({ name: 'id', description: 'Bill ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Bill deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bill not found' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() scopeQuery: ScopeQueryDto
  ) {
    await this.billsService.deleteWithScope(user.id, id, scopeQuery.scope ?? 'this');
  }

  @Patch(':id/mark-paid')
  @ApiOperation({ summary: 'Mark bill as paid' })
  @ApiParam({ name: 'id', description: 'Bill ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bill marked as paid' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bill not found' })
  async markAsPaid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const bill = await this.billsService.markAsPaid(user.id, id);
    return { bill };
  }

  @Patch(':id/mark-unpaid')
  @ApiOperation({ summary: 'Mark bill as unpaid' })
  @ApiParam({ name: 'id', description: 'Bill ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bill marked as unpaid' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bill not found' })
  async markAsUnpaid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const bill = await this.billsService.markAsUnpaid(user.id, id);
    return { bill };
  }
}
