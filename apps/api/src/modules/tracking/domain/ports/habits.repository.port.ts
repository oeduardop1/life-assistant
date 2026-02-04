import type { Habit, NewHabit, HabitCompletion, NewHabitCompletion } from '@life-assistant/database';

/**
 * Search parameters for habits
 */
export interface HabitSearchParams {
  isActive?: boolean | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

/**
 * Search parameters for habit completions
 *
 * Date parameters accept either Date objects or YYYY-MM-DD strings.
 * Prefer strings to avoid timezone conversion issues.
 */
export interface HabitCompletionSearchParams {
  habitId?: string;
  /** Start date filter - accepts Date or YYYY-MM-DD string (preferred) */
  startDate?: Date | string;
  /** End date filter - accepts Date or YYYY-MM-DD string (preferred) */
  endDate?: Date | string;
  limit?: number;
  offset?: number;
}

/**
 * Habit with calculated current streak
 */
export interface HabitWithStreak extends Habit {
  currentStreak: number;
}

/**
 * Port for habit persistence operations
 *
 * @see docs/specs/domains/tracking.md §5 for Habits spec
 */
export interface HabitsRepositoryPort {
  /**
   * Create a new habit
   */
  create(userId: string, data: Omit<NewHabit, 'userId'>): Promise<Habit>;

  /**
   * Find habits for a user with filters
   */
  findByUserId(userId: string, params: HabitSearchParams): Promise<Habit[]>;

  /**
   * Find a habit by ID
   */
  findById(userId: string, habitId: string): Promise<Habit | null>;

  /**
   * Find a habit by name (for fuzzy matching in AI tools)
   */
  findByName(userId: string, name: string): Promise<Habit | null>;

  /**
   * Update a habit
   */
  update(userId: string, habitId: string, data: Partial<Omit<NewHabit, 'userId'>>): Promise<Habit | null>;

  /**
   * Soft delete a habit
   */
  delete(userId: string, habitId: string): Promise<boolean>;

  /**
   * Create a habit completion
   */
  createCompletion(
    userId: string,
    habitId: string,
    data: Omit<NewHabitCompletion, 'userId' | 'habitId'>
  ): Promise<HabitCompletion>;

  /**
   * Delete a habit completion (uncomplete)
   */
  deleteCompletion(userId: string, habitId: string, date: string): Promise<boolean>;

  /**
   * Find completions for a habit
   */
  findCompletions(userId: string, params: HabitCompletionSearchParams): Promise<HabitCompletion[]>;

  /**
   * Check if habit is completed on a specific date
   */
  isCompletedOnDate(userId: string, habitId: string, date: string): Promise<boolean>;

  /**
   * Get completions for a specific date (all habits)
   */
  getCompletionsForDate(userId: string, date: string): Promise<HabitCompletion[]>;

  /**
   * Update longest streak if current streak exceeds it
   */
  updateLongestStreak(userId: string, habitId: string, currentStreak: number): Promise<void>;
}

export const HABITS_REPOSITORY = Symbol('HABITS_REPOSITORY');
