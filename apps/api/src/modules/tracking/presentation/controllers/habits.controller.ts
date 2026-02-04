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
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { getTodayInTimezone } from '@life-assistant/shared';
import { HabitsService } from '../../application/services/habits.service';
import { SettingsService } from '../../../settings/application/services/settings.service';
import { CurrentUser } from '../../../../common/decorators';
import type { AuthenticatedUser } from '../../../../common/types/request.types';
import {
  CreateHabitDto,
  UpdateHabitDto,
  CompleteHabitDto,
  UncompleteHabitDto,
  GetHabitsQueryDto,
  GetHabitCompletionsQueryDto,
} from '../dtos/habits.dto';
import type { HabitFrequency, PeriodOfDay } from '@life-assistant/database';

/**
 * Controller for habits CRUD and completion operations
 *
 * @see docs/specs/domains/tracking.md §6.2 for API spec
 */
@ApiTags('Habits')
@ApiBearerAuth()
@Controller('habits')
export class HabitsController {
  constructor(
    private readonly habitsService: HabitsService,
    private readonly settingsService: SettingsService
  ) {}

  /**
   * Get user's timezone from settings, defaulting to America/Sao_Paulo
   */
  private async getUserTimezone(userId: string): Promise<string> {
    try {
      const settings = await this.settingsService.getUserSettings(userId);
      return settings.timezone;
    } catch {
      return 'America/Sao_Paulo';
    }
  }

  /**
   * Create a new habit
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a habit' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Habit created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Habit with same name exists' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHabitDto) {
    const habit = await this.habitsService.create(user.id, {
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      color: dto.color,
      frequency: dto.frequency as HabitFrequency | undefined,
      frequencyDays: dto.frequencyDays,
      periodOfDay: dto.periodOfDay as PeriodOfDay | undefined,
      sortOrder: dto.sortOrder,
    });

    return { habit };
  }

  /**
   * Get all habits for the current user
   */
  @Get()
  @ApiOperation({ summary: 'List habits' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Habits retrieved successfully' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: GetHabitsQueryDto) {
    const habits = await this.habitsService.findAll(user.id, query.includeInactive);
    return { habits };
  }

  /**
   * Get streaks for all habits
   */
  @Get('streaks')
  @ApiOperation({ summary: 'Get streaks for all habits' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Streaks retrieved successfully' })
  async getStreaks(@CurrentUser() user: AuthenticatedUser) {
    const streaks = await this.habitsService.getAllStreaks(user.id);
    return { streaks };
  }

  /**
   * Get habit completions with statistics
   *
   * Returns completions for the specified date range (default 12 weeks)
   * along with stats: totalCompletions, completionRate, currentStreak, longestStreak
   */
  @Get(':id/completions')
  @ApiOperation({ summary: 'Get habit completions with stats' })
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Completions retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Habit not found' })
  async getCompletions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: GetHabitCompletionsQueryDto
  ) {
    const result = await this.habitsService.getCompletionsWithStats(
      user.id,
      id,
      query.startDate,
      query.endDate
    );
    if (!result) {
      throw new NotFoundException('Hábito não encontrado');
    }
    return result;
  }

  /**
   * Get a habit by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a habit by ID' })
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Habit retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Habit not found' })
  async getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const habit = await this.habitsService.findById(user.id, id);
    if (!habit) {
      throw new NotFoundException('Hábito não encontrado');
    }
    return { habit };
  }

  /**
   * Update a habit
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a habit' })
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Habit updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Habit not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Habit with same name exists' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHabitDto
  ) {
    const habit = await this.habitsService.update(user.id, id, {
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      color: dto.color,
      frequency: dto.frequency as HabitFrequency | undefined,
      frequencyDays: dto.frequencyDays,
      periodOfDay: dto.periodOfDay as PeriodOfDay | undefined,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    });

    if (!habit) {
      throw new NotFoundException('Hábito não encontrado');
    }

    return { habit };
  }

  /**
   * Delete a habit (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a habit' })
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Habit deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Habit not found' })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const deleted = await this.habitsService.delete(user.id, id);
    if (!deleted) {
      throw new NotFoundException('Hábito não encontrado');
    }
  }

  /**
   * Mark a habit as completed
   */
  @Post(':id/complete')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mark habit as completed' })
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Habit marked as completed' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Habit not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Already completed on this date' })
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CompleteHabitDto
  ) {
    // Get user timezone for accurate "today" calculation
    const timezone = await this.getUserTimezone(user.id);
    const date = dto.date ?? getTodayInTimezone(timezone);
    const completion = await this.habitsService.complete(user.id, id, date, 'form', dto.notes);

    // Get updated habit with streak
    const habit = await this.habitsService.findById(user.id, id);
    const habitName = habit?.name ?? 'Hábito';

    return {
      completion,
      habit,
      message: `Hábito "${habitName}" concluído em ${date}`,
    };
  }

  /**
   * Remove habit completion (uncomplete)
   */
  @Delete(':id/uncomplete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove habit completion' })
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Completion removed' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Habit not found' })
  async uncomplete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UncompleteHabitDto
  ) {
    const deleted = await this.habitsService.uncomplete(user.id, id, dto.date);

    // Get updated habit with streak
    const habit = await this.habitsService.findById(user.id, id);
    const habitName = habit?.name ?? 'Hábito';

    return {
      success: deleted,
      habit,
      message: deleted
        ? `Conclusão do hábito "${habitName}" removida de ${dto.date}`
        : 'Não havia conclusão para remover',
    };
  }
}
