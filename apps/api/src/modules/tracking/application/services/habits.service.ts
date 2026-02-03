import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import type { Habit, HabitCompletion, HabitFrequency, PeriodOfDay } from '@life-assistant/database';
import {
  HabitsRepositoryPort,
  HABITS_REPOSITORY,
  type HabitWithStreak,
} from '../../domain/ports/habits.repository.port';

/**
 * Parameters for creating a habit
 */
export interface CreateHabitParams {
  name: string;
  description?: string | undefined;
  icon?: string | undefined;
  color?: string | undefined;
  frequency?: HabitFrequency | undefined;
  frequencyDays?: number[] | undefined;
  periodOfDay?: PeriodOfDay | undefined;
  sortOrder?: number | undefined;
}

/**
 * Parameters for updating a habit
 */
export interface UpdateHabitParams {
  name?: string | undefined;
  description?: string | undefined;
  icon?: string | undefined;
  color?: string | undefined;
  frequency?: HabitFrequency | undefined;
  frequencyDays?: number[] | undefined;
  periodOfDay?: PeriodOfDay | undefined;
  sortOrder?: number | undefined;
  isActive?: boolean | undefined;
}

/**
 * Habit with completion status for a specific date
 */
export interface HabitWithCompletion {
  habit: HabitWithStreak;
  completed: boolean;
  completedAt?: Date | undefined;
}

/**
 * All streaks response
 */
export interface HabitStreakInfo {
  habitId: string;
  name: string;
  icon: string;
  color?: string | null;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Service for managing habits and streaks
 *
 * @see docs/specs/domains/tracking.md §5 for Habits spec
 */
@Injectable()
export class HabitsService {
  private readonly logger = new Logger(HabitsService.name);

  constructor(
    @Inject(HABITS_REPOSITORY)
    private readonly habitsRepository: HabitsRepositoryPort
  ) {}

  /**
   * Create a new habit
   */
  async create(userId: string, params: CreateHabitParams): Promise<Habit> {
    this.logger.log(`Creating habit "${params.name}" for user ${userId}`);

    // Check for duplicate name
    const existing = await this.habitsRepository.findByName(userId, params.name);
    if (existing) {
      throw new ConflictException(`Já existe um hábito com o nome "${params.name}"`);
    }

    return this.habitsRepository.create(userId, {
      name: params.name,
      description: params.description,
      icon: params.icon ?? '✓',
      color: params.color,
      frequency: params.frequency ?? 'daily',
      frequencyDays: params.frequencyDays ?? [],
      periodOfDay: params.periodOfDay ?? 'anytime',
      sortOrder: params.sortOrder ?? 0,
    });
  }

  /**
   * Get all habits for a user (active only by default)
   */
  async findAll(userId: string, includeInactive = false): Promise<HabitWithStreak[]> {
    const habits = await this.habitsRepository.findByUserId(userId, {
      isActive: includeInactive ? undefined : true,
    });

    // Calculate current streak for each habit
    const habitsWithStreaks: HabitWithStreak[] = [];
    for (const habit of habits) {
      const currentStreak = await this.calculateStreak(userId, habit);
      habitsWithStreaks.push({
        ...habit,
        currentStreak,
      });
    }

    return habitsWithStreaks;
  }

  /**
   * Get a habit by ID
   */
  async findById(userId: string, habitId: string): Promise<HabitWithStreak | null> {
    const habit = await this.habitsRepository.findById(userId, habitId);
    if (!habit) return null;

    const currentStreak = await this.calculateStreak(userId, habit);
    return { ...habit, currentStreak };
  }

  /**
   * Update a habit
   */
  async update(userId: string, habitId: string, params: UpdateHabitParams): Promise<Habit | null> {
    // If renaming, check for duplicate
    if (params.name) {
      const existing = await this.habitsRepository.findByName(userId, params.name);
      if (existing && existing.id !== habitId) {
        throw new ConflictException(`Já existe um hábito com o nome "${params.name}"`);
      }
    }

    // Filter out undefined values
    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.icon !== undefined) updateData.icon = params.icon;
    if (params.color !== undefined) updateData.color = params.color;
    if (params.frequency !== undefined) updateData.frequency = params.frequency;
    if (params.frequencyDays !== undefined) updateData.frequencyDays = params.frequencyDays;
    if (params.periodOfDay !== undefined) updateData.periodOfDay = params.periodOfDay;
    if (params.sortOrder !== undefined) updateData.sortOrder = params.sortOrder;
    if (params.isActive !== undefined) updateData.isActive = params.isActive;

    return this.habitsRepository.update(userId, habitId, updateData);
  }

  /**
   * Delete a habit (soft delete)
   */
  async delete(userId: string, habitId: string): Promise<boolean> {
    return this.habitsRepository.delete(userId, habitId);
  }

  /**
   * Mark a habit as completed for a date
   */
  async complete(
    userId: string,
    habitId: string,
    date: string,
    source = 'form',
    notes?: string
  ): Promise<HabitCompletion> {
    // Verify habit exists
    const habit = await this.habitsRepository.findById(userId, habitId);
    if (!habit) {
      throw new NotFoundException('Hábito não encontrado');
    }

    // Check if already completed
    const alreadyCompleted = await this.habitsRepository.isCompletedOnDate(userId, habitId, date);
    if (alreadyCompleted) {
      throw new ConflictException('Hábito já foi marcado como concluído nesta data');
    }

    this.logger.log(`Completing habit ${habitId} for user ${userId} on ${date}`);

    const completion = await this.habitsRepository.createCompletion(userId, habitId, {
      completionDate: date,
      source,
      notes,
    });

    // Update longest streak if needed
    const currentStreak = await this.calculateStreak(userId, habit);
    await this.habitsRepository.updateLongestStreak(userId, habitId, currentStreak);

    return completion;
  }

  /**
   * Unmark a habit completion for a date
   */
  async uncomplete(userId: string, habitId: string, date: string): Promise<boolean> {
    // Verify habit exists
    const habit = await this.habitsRepository.findById(userId, habitId);
    if (!habit) {
      throw new NotFoundException('Hábito não encontrado');
    }

    this.logger.log(`Uncompleting habit ${habitId} for user ${userId} on ${date}`);

    return this.habitsRepository.deleteCompletion(userId, habitId, date);
  }

  /**
   * Get habits with completion status for a specific date
   */
  async getHabitsForDate(userId: string, date: string): Promise<HabitWithCompletion[]> {
    const habits = await this.findAll(userId);
    const completions = await this.habitsRepository.getCompletionsForDate(userId, date);

    const completionMap = new Map(completions.map((c) => [c.habitId, c]));

    return habits.map((habit) => {
      const completion = completionMap.get(habit.id);
      return {
        habit,
        completed: !!completion,
        completedAt: completion?.completedAt ?? undefined,
      };
    });
  }

  /**
   * Get all streaks for a user
   */
  async getAllStreaks(userId: string): Promise<HabitStreakInfo[]> {
    const habits = await this.findAll(userId);

    return habits.map((habit) => ({
      habitId: habit.id,
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
    }));
  }

  /**
   * Get completions for a date range
   * Used by CalendarService to build month summaries
   */
  async getCompletionsForDateRange(
    userId: string,
    habitId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HabitCompletion[]> {
    return this.habitsRepository.findCompletions(userId, {
      habitId,
      startDate,
      endDate,
      limit: 31,
    });
  }

  /**
   * Calculate current streak for a habit
   *
   * @see docs/specs/domains/tracking.md §5.3 for streak rules
   */
  async calculateStreak(userId: string, habit: Habit): Promise<number> {
    // Get completions for the last 365 days
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 365);

    const completions = await this.habitsRepository.findCompletions(userId, {
      habitId: habit.id,
      startDate,
      endDate,
      limit: 365,
    });

    if (completions.length === 0) {
      return 0;
    }

    // Create a set of completion dates for quick lookup
    const completionDates = new Set(completions.map((c) => c.completionDate));

    // Start from today and count backwards
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if today is completed (or if we should start from yesterday)
    const todayStr = this.formatDate(today);
    let currentDate = new Date(today);

    // If today isn't completed yet, check if it's still within the habit's expected time
    // For simplicity, we allow checking yesterday if today isn't completed
    if (!completionDates.has(todayStr)) {
      // Check if we should break the streak or give grace for today
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = this.formatDate(yesterday);

      if (!this.isExpectedDay(yesterday, habit)) {
        // Yesterday wasn't an expected day, find the last expected day
        currentDate = this.findLastExpectedDay(today, habit);
      } else if (!completionDates.has(yesterdayStr)) {
        // Yesterday was expected but not completed - streak is broken
        return 0;
      } else {
        // Yesterday was completed, start counting from yesterday
        currentDate = yesterday;
      }
    }

    // Count consecutive expected days with completions
    let continueLoop = true;
    while (continueLoop) {
      const dateStr = this.formatDate(currentDate);

      if (this.isExpectedDay(currentDate, habit)) {
        if (completionDates.has(dateStr)) {
          streak++;
        } else {
          // Expected day without completion - streak ends
          continueLoop = false;
          continue;
        }
      }
      // If not an expected day, just continue (don't break streak)

      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1);

      // Don't go back more than 365 days
      if (currentDate < startDate) {
        continueLoop = false;
      }
    }

    return streak;
  }

  /**
   * Check if a date is an expected day for this habit based on frequency
   */
  private isExpectedDay(date: Date, habit: Habit): boolean {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    switch (habit.frequency) {
      case 'daily':
        return true;

      case 'weekdays':
        return dayOfWeek >= 1 && dayOfWeek <= 5;

      case 'weekends':
        return dayOfWeek === 0 || dayOfWeek === 6;

      case 'custom': {
        const frequencyDays = habit.frequencyDays as number[] | null;
        return frequencyDays ? frequencyDays.includes(dayOfWeek) : false;
      }

      default:
        return true;
    }
  }

  /**
   * Find the last expected day before the given date
   */
  private findLastExpectedDay(fromDate: Date, habit: Habit): Date {
    const date = new Date(fromDate);
    for (let i = 0; i < 7; i++) {
      date.setDate(date.getDate() - 1);
      if (this.isExpectedDay(date, habit)) {
        return date;
      }
    }
    return date;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0] ?? '';
  }
}
