// apps/api/src/modules/finance/presentation/controllers/debts.controller.ts

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
import { DebtsService } from '../../application/services/debts.service';
import { CreateDebtDto, UpdateDebtDto, NegotiateDebtDto } from '../dtos/debt.dto';
import { DebtQueryDto } from '../dtos/query.dto';

@ApiTags('Finance - Debts')
@ApiBearerAuth()
@Controller('finance/debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new debt' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Debt created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDebtDto
  ) {
    const debt = await this.debtsService.create(user.id, {
      name: dto.name,
      creditor: dto.creditor,
      totalAmount: dto.totalAmount.toString(),
      isNegotiated: dto.isNegotiated ?? true,
      totalInstallments: dto.totalInstallments,
      installmentAmount: dto.installmentAmount?.toString(),
      dueDay: dto.dueDay,
      notes: dto.notes,
      currency: dto.currency ?? 'BRL',
    });
    return { debt };
  }

  @Get()
  @ApiOperation({ summary: 'List debts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of debts' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DebtQueryDto
  ) {
    const { debts, total } = await this.debtsService.findAll(user.id, {
      status: query.status,
      isNegotiated: query.isNegotiated,
      limit: query.limit,
      offset: query.offset,
    });
    return { debts, total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get debt by ID' })
  @ApiParam({ name: 'id', description: 'Debt ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Debt found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Debt not found' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const debt = await this.debtsService.findById(user.id, id);
    return { debt };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update debt' })
  @ApiParam({ name: 'id', description: 'Debt ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Debt updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Debt not found' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDebtDto
  ) {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.creditor !== undefined) updateData.creditor = dto.creditor;
    if (dto.totalAmount !== undefined)
      updateData.totalAmount = dto.totalAmount.toString();
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.currency !== undefined) updateData.currency = dto.currency;

    const debt = await this.debtsService.update(user.id, id, updateData);
    return { debt };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete debt' })
  @ApiParam({ name: 'id', description: 'Debt ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Debt deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Debt not found' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    await this.debtsService.delete(user.id, id);
  }

  @Patch(':id/pay-installment')
  @ApiOperation({ summary: 'Pay an installment' })
  @ApiParam({ name: 'id', description: 'Debt ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Installment paid' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Debt not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Debt not negotiated or already paid off',
  })
  async payInstallment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const debt = await this.debtsService.payInstallment(user.id, id);
    return { debt };
  }

  @Patch(':id/negotiate')
  @ApiOperation({ summary: 'Negotiate a debt' })
  @ApiParam({ name: 'id', description: 'Debt ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Debt negotiated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Debt not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Debt already negotiated',
  })
  async negotiate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: NegotiateDebtDto
  ) {
    const debt = await this.debtsService.negotiate(user.id, id, {
      totalInstallments: dto.totalInstallments,
      installmentAmount: dto.installmentAmount,
      dueDay: dto.dueDay,
    });
    return { debt };
  }
}
