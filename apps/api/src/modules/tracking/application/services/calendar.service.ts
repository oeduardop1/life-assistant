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
   * Uses date strings directly to avoid timezone conversion issues.
   *
   * @see docs/specs/domains/tracking.md §3.2 for calendar format
   */
  async getMonthSummary(userId: string, year: number, month: number): Promise<CalendarMonthResponse> {
    const monthStr = `${String(year)}-${String(month).padStart(2, '0')}`;
    this.logger.log(`Getting calendar summary for ${monthStr} for user ${userId}`);

    // Calculate date range for the month using pure string manipulation
    // This avoids timezone issues with Date objects
    const startDateStr = `${monthStr}-01`;
    const daysInMonth = this.getDaysInMonth(year, month);
    const endDateStr = `${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

    // Get all tracking entries for the month using string dates
    const entries = await this.trackingRepository.findByUserId(userId, {
      startDate: startDateStr,
      endDate: endDateStr,
      limit: 1000,
    });

    // Get all habits
    const habits = await this.habitsService.findAll(userId);

    // Get completions for the month using string dates
    const completions = await this.getCompletionsForMonth(userId, startDateStr, endDateStr);

    // Build day summaries using string-based iteration
    const days: CalendarDaySummary[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
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
    }

    return { month: monthStr, days };
  }

  /**
   * Get number of days in a month (pure calculation, no timezone issues)
   */
  private getDaysInMonth(year: number, month: number): number {
    // Use UTC to avoid timezone issues - we just need the number of days
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  /**
   * Get detailed data for a specific day
   *
   * Uses date string directly to avoid timezone conversion issues.
   * The date parameter should be in YYYY-MM-DD format (user's local date).
   */
  async getDayDetail(userId: string, date: string): Promise<DayDetailResponse> {
    this.logger.log(`Getting day detail for ${date} for user ${userId}`);

    // Use date string directly - no Date object conversion needed
    // This avoids timezone issues where new Date('2026-02-04') creates UTC midnight,
    // which in local time could be the previous day (e.g., Feb 3 at 21:00 in UTC-3)

    // Get tracking entries for the day using string comparison
    const metrics = await this.trackingRepository.findByUserId(userId, {
      startDate: date, // Pass string directly
      endDate: date,   // Same date for single-day query
      limit: 100,
    });

    // Get habits with completion status for the day
    const habits = await this.habitsService.getHabitsForDate(userId, date);

    return { date, metrics, habits };
  }

  /**
   * Get tracking entries for a specific date
   *
   * Uses date string directly to avoid timezone conversion issues.
   */
  async getMetricsByDate(userId: string, date: string): Promise<TrackingEntry[]> {
    // Use date string directly - no Date object conversion needed
    return this.trackingRepository.findByUserId(userId, {
      startDate: date, // Pass string directly
      endDate: date,   // Same date for single-day query
      limit: 100,
    });
  }

  /**
   * Get completions for a month (internal helper)
   *
   * Accepts date strings (YYYY-MM-DD format) to avoid timezone issues.
   */
  private async getCompletionsForMonth(
    userId: string,
    startDateStr: string,
    endDateStr: string
  ): Promise<HabitCompletion[]> {
    // Get all habits to get their IDs
    const habits = await this.habitsService.findAll(userId);

    // Aggregate completions from all habits
    const allCompletions: HabitCompletion[] = [];

    for (const habit of habits) {
      const completions = await this.habitsService.getCompletionsForDateRangeStr(
        userId,
        habit.id,
        startDateStr,
        endDateStr
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
}
