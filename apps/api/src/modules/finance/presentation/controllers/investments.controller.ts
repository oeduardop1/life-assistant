// apps/api/src/modules/finance/presentation/controllers/investments.controller.ts

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
import { InvestmentsService } from '../../application/services/investments.service';
import {
  CreateInvestmentDto,
  UpdateInvestmentDto,
  UpdateInvestmentValueDto,
} from '../dtos/investment.dto';
import { InvestmentQueryDto } from '../dtos/query.dto';

@ApiTags('Finance - Investments')
@ApiBearerAuth()
@Controller('finance/investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new investment' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Investment created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvestmentDto
  ) {
    const investment = await this.investmentsService.create(user.id, {
      name: dto.name,
      type: dto.type,
      goalAmount: dto.goalAmount?.toString(),
      currentAmount: dto.currentAmount?.toString() ?? '0',
      monthlyContribution: dto.monthlyContribution?.toString(),
      deadline: dto.deadline,
      currency: dto.currency ?? 'BRL',
    });
    return { investment };
  }

  @Get()
  @ApiOperation({ summary: 'List investments' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of investments' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: InvestmentQueryDto
  ) {
    const { investments, total } = await this.investmentsService.findAll(
      user.id,
      {
        type: query.type,
        limit: query.limit,
        offset: query.offset,
      }
    );
    return { investments, total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get investment by ID' })
  @ApiParam({ name: 'id', description: 'Investment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Investment found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Investment not found',
  })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const investment = await this.investmentsService.findById(user.id, id);
    return { investment };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update investment' })
  @ApiParam({ name: 'id', description: 'Investment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Investment updated' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Investment not found',
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvestmentDto
  ) {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.goalAmount !== undefined)
      updateData.goalAmount = dto.goalAmount.toString();
    if (dto.currentAmount !== undefined)
      updateData.currentAmount = dto.currentAmount.toString();
    if (dto.monthlyContribution !== undefined)
      updateData.monthlyContribution = dto.monthlyContribution.toString();
    if (dto.deadline !== undefined) updateData.deadline = dto.deadline;
    if (dto.currency !== undefined) updateData.currency = dto.currency;

    const investment = await this.investmentsService.update(
      user.id,
      id,
      updateData
    );
    return { investment };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete investment' })
  @ApiParam({ name: 'id', description: 'Investment ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Investment deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Investment not found',
  })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    await this.investmentsService.delete(user.id, id);
  }

  @Patch(':id/update-value')
  @ApiOperation({ summary: 'Update investment current value' })
  @ApiParam({ name: 'id', description: 'Investment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Value updated' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Investment not found',
  })
  async updateValue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvestmentValueDto
  ) {
    const investment = await this.investmentsService.updateValue(
      user.id,
      id,
      dto.currentAmount
    );
    return { investment };
  }
}
