import { Injectable, Inject, Logger } from '@nestjs/common';
import type { TrackingEntry, HabitCompletion } from '@life-assistant/database';
import {
  TrackingEntryRepositoryPort,
  TRACKING_ENTRY_REPOSITORY,
} from '../../domain/ports/tracking-entry.repository.port';
import { HabitsService, type HabitWithCompletion } from './habits.service';

/**
 * Calendar day summary
 */
export interface CalendarDaySummary {
  date: string;
  moodScore?: number | undefined;
  moodColor: 'green' | 'yellow' | 'red' | 'gray';
  habitsCompleted: number;
  habitsTotal: number;
  hasData: boolean;
}

/**
 * Calendar month response
 */
export interface CalendarMonthResponse {
  month: string;
  days: CalendarDaySummary[];
}

/**
 * Day detail response
 */
export interface DayDetailResponse {
  date: string;
  metrics: TrackingEntry[];
  habits: HabitWithCompletion[];
}

/**
 * Service for calendar views
 *
 * @see docs/specs/domains/tracking.md §6.3 for Calendar API spec
 */
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @Inject(TRACKING_ENTRY_REPOSITORY)
    private readonly trackingRepository: TrackingEntryRepositoryPort,
    private readonly habitsService: HabitsService
  ) {}

  /**
   * Get month summary for calendar view
   *
   * @see docs/specs/domains/tracking.md §3.2 for calendar format
   */
  async getMonthSummary(userId: string, year: number, month: number): Promise<CalendarMonthResponse> {
    const monthStr = `${String(year)}-${String(month).padStart(2, '0')}`;
    this.logger.log(`Getting calendar summary for ${monthStr} for user ${userId}`);

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    // Get all tracking entries for the month
    const entries = await this.trackingRepository.findByUserId(userId, {
      startDate,
      endDate,
      limit: 1000,
    });

    // Get all habits
    const habits = await this.habitsService.findAll(userId);

    // Get completions for the month
    const completions = await this.getCompletionsForMonth(userId, startDate, endDate);

    // Build day summaries
    const days: CalendarDaySummary[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = this.formatDate(currentDate);
      const dayEntries = entries.filter((e) => e.entryDate === dateStr);
      const dayCompletions = completions.filter((c) => c.completionDate === dateStr);

      // Get mood score for the day
      const moodEntry = dayEntries.find((e) => e.type === 'mood');
      const moodScore = moodEntry ? parseFloat(moodEntry.value) : undefined;

      // Calculate mood color
      const moodColor = this.getMoodColor(moodScore);

      // Calculate habits stats
      const habitsTotal = habits.length;
      const habitsCompleted = dayCompletions.length;

      days.push({
        date: dateStr,
        moodScore,
        moodColor,
        habitsCompleted,
        habitsTotal,
        hasData: dayEntries.length > 0 || dayCompletions.length > 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { month: monthStr, days };
  }

  /**
   * Get detailed data for a specific day
   */
  async getDayDetail(userId: string, date: string): Promise<DayDetailResponse> {
    this.logger.log(`Getting day detail for ${date} for user ${userId}`);

    // Parse date
    const dateObj = new Date(date);
    const startDate = new Date(dateObj);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateObj);
    endDate.setHours(23, 59, 59, 999);

    // Get tracking entries for the day
    const metrics = await this.trackingRepository.findByUserId(userId, {
      startDate,
      endDate,
      limit: 100,
    });

    // Get habits with completion status for the day
    const habits = await this.habitsService.getHabitsForDate(userId, date);

    return { date, metrics, habits };
  }

  /**
   * Get tracking entries for a specific date
   */
  async getMetricsByDate(userId: string, date: string): Promise<TrackingEntry[]> {
    const dateObj = new Date(date);
    const startDate = new Date(dateObj);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateObj);
    endDate.setHours(23, 59, 59, 999);

    return this.trackingRepository.findByUserId(userId, {
      startDate,
      endDate,
      limit: 100,
    });
  }

  /**
   * Get completions for a month (internal helper)
   */
  private async getCompletionsForMonth(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HabitCompletion[]> {
    // Get all habits to get their IDs
    const habits = await this.habitsService.findAll(userId);

    // Aggregate completions from all habits
    const allCompletions: HabitCompletion[] = [];

    for (const habit of habits) {
      const completions = await this.habitsService.getCompletionsForDateRange(
        userId,
        habit.id,
        startDate,
        endDate
      );
      allCompletions.push(...completions);
    }

    return allCompletions;
  }

  /**
   * Get mood color based on score
   *
   * @see docs/specs/domains/tracking.md §3.2 for color mapping
   */
  private getMoodColor(moodScore: number | undefined): 'green' | 'yellow' | 'red' | 'gray' {
    if (moodScore === undefined) return 'gray';
    if (moodScore >= 7) return 'green';
    if (moodScore >= 4) return 'yellow';
    return 'red';
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0] ?? '';
  }
}
