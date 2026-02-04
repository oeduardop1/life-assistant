import { Injectable } from '@nestjs/common';
import { eq, and, gte, lte, desc, isNull, ilike } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type {
  HabitsRepositoryPort,
  HabitSearchParams,
  HabitCompletionSearchParams,
} from '../../domain/ports/habits.repository.port';
import type { Habit, NewHabit, HabitCompletion, NewHabitCompletion } from '@life-assistant/database';

/**
 * Convert Date or string to YYYY-MM-DD string format.
 *
 * IMPORTANT: When passing a Date object, this uses toISOString() which converts to UTC.
 * This can cause timezone issues if the Date was created from a local time.
 * Prefer passing YYYY-MM-DD strings directly to avoid timezone conversion issues.
 *
 * @param date - Date object or YYYY-MM-DD string
 * @returns YYYY-MM-DD string
 */
function formatDateToString(date: Date | string): string {
  if (typeof date === 'string') {
    // Already a string - validate format and return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // If it's an ISO timestamp string, extract just the date part
    return date.split('T')[0] ?? '';
  }
  // Date object - convert to ISO and extract date
  // WARNING: This can cause timezone issues!
  return date.toISOString().split('T')[0] ?? '';
}

/**
 * Drizzle implementation of HabitsRepositoryPort
 *
 * Uses RLS via withUserId for all operations
 * @see docs/specs/domains/tracking.md §5 for Habits spec
 */
@Injectable()
export class HabitsRepository implements HabitsRepositoryPort {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, data: Omit<NewHabit, 'userId'>): Promise<Habit> {
    return this.db.withUserId(userId, async (db) => {
      const [habit] = await db
        .insert(this.db.schema.habits)
        .values({
          ...data,
          userId,
        })
        .returning();

      if (!habit) {
        throw new Error('Failed to create habit');
      }

      return habit;
    });
  }

  async findByUserId(userId: string, params: HabitSearchParams): Promise<Habit[]> {
    const { isActive, limit = 50, offset = 0 } = params;

    return this.db.withUserId(userId, async (db) => {
      const conditions = [
        eq(this.db.schema.habits.userId, userId),
        isNull(this.db.schema.habits.deletedAt),
      ];

      if (isActive !== undefined) {
        conditions.push(eq(this.db.schema.habits.isActive, isActive));
      }

      return db
        .select()
        .from(this.db.schema.habits)
        .where(and(...conditions))
        .orderBy(this.db.schema.habits.sortOrder, this.db.schema.habits.createdAt)
        .limit(limit)
        .offset(offset);
    });
  }

  async findById(userId: string, habitId: string): Promise<Habit | null> {
    return this.db.withUserId(userId, async (db) => {
      const [habit] = await db
        .select()
        .from(this.db.schema.habits)
        .where(
          and(
            eq(this.db.schema.habits.id, habitId),
            eq(this.db.schema.habits.userId, userId),
            isNull(this.db.schema.habits.deletedAt)
          )
        )
        .limit(1);
      return habit ?? null;
    });
  }

  async findByName(userId: string, name: string): Promise<Habit | null> {
    return this.db.withUserId(userId, async (db) => {
      // Try exact match first
      let [habit] = await db
        .select()
        .from(this.db.schema.habits)
        .where(
          and(
            eq(this.db.schema.habits.userId, userId),
            eq(this.db.schema.habits.name, name),
            isNull(this.db.schema.habits.deletedAt)
          )
        )
        .limit(1);

      if (habit) return habit;

      // Try case-insensitive match
      [habit] = await db
        .select()
        .from(this.db.schema.habits)
        .where(
          and(
            eq(this.db.schema.habits.userId, userId),
            ilike(this.db.schema.habits.name, name),
            isNull(this.db.schema.habits.deletedAt)
          )
        )
        .limit(1);

      if (habit) return habit;

      // Try partial match (contains)
      [habit] = await db
        .select()
        .from(this.db.schema.habits)
        .where(
          and(
            eq(this.db.schema.habits.userId, userId),
            ilike(this.db.schema.habits.name, `%${name}%`),
            isNull(this.db.schema.habits.deletedAt)
          )
        )
        .limit(1);

      return habit ?? null;
    });
  }

  async update(
    userId: string,
    habitId: string,
    data: Partial<Omit<NewHabit, 'userId'>>
  ): Promise<Habit | null> {
    return this.db.withUserId(userId, async (db) => {
      const [updated] = await db
        .update(this.db.schema.habits)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.habits.id, habitId),
            eq(this.db.schema.habits.userId, userId),
            isNull(this.db.schema.habits.deletedAt)
          )
        )
        .returning();
      return updated ?? null;
    });
  }

  async delete(userId: string, habitId: string): Promise<boolean> {
    return this.db.withUserId(userId, async (db) => {
      const [deleted] = await db
        .update(this.db.schema.habits)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(this.db.schema.habits.id, habitId),
            eq(this.db.schema.habits.userId, userId),
            isNull(this.db.schema.habits.deletedAt)
          )
        )
        .returning();
      return !!deleted;
    });
  }

  async createCompletion(
    userId: string,
    habitId: string,
    data: Omit<NewHabitCompletion, 'userId' | 'habitId'>
  ): Promise<HabitCompletion> {
    return this.db.withUserId(userId, async (db) => {
      const [completion] = await db
        .insert(this.db.schema.habitCompletions)
        .values({
          ...data,
          userId,
          habitId,
        })
        .returning();

      if (!completion) {
        throw new Error('Failed to create habit completion');
      }

      return completion;
    });
  }

  async deleteCompletion(userId: string, habitId: string, date: string): Promise<boolean> {
    return this.db.withUserId(userId, async (db) => {
      const [deleted] = await db
        .delete(this.db.schema.habitCompletions)
        .where(
          and(
            eq(this.db.schema.habitCompletions.habitId, habitId),
            eq(this.db.schema.habitCompletions.userId, userId),
            eq(this.db.schema.habitCompletions.completionDate, date)
          )
        )
        .returning();
      return !!deleted;
    });
  }

  async findCompletions(
    userId: string,
    params: HabitCompletionSearchParams
  ): Promise<HabitCompletion[]> {
    const { habitId, startDate, endDate, limit = 100, offset = 0 } = params;

    return this.db.withUserId(userId, async (db) => {
      const conditions = [eq(this.db.schema.habitCompletions.userId, userId)];

      if (habitId) {
        conditions.push(eq(this.db.schema.habitCompletions.habitId, habitId));
      }

      if (startDate) {
        conditions.push(gte(this.db.schema.habitCompletions.completionDate, formatDateToString(startDate)));
      }

      if (endDate) {
        conditions.push(lte(this.db.schema.habitCompletions.completionDate, formatDateToString(endDate)));
      }

      return db
        .select()
        .from(this.db.schema.habitCompletions)
        .where(and(...conditions))
        .orderBy(desc(this.db.schema.habitCompletions.completionDate))
        .limit(limit)
        .offset(offset);
    });
  }

  async isCompletedOnDate(userId: string, habitId: string, date: string): Promise<boolean> {
    return this.db.withUserId(userId, async (db) => {
      const [completion] = await db
        .select()
        .from(this.db.schema.habitCompletions)
        .where(
          and(
            eq(this.db.schema.habitCompletions.habitId, habitId),
            eq(this.db.schema.habitCompletions.userId, userId),
            eq(this.db.schema.habitCompletions.completionDate, date)
          )
        )
        .limit(1);
      return !!completion;
    });
  }

  async getCompletionsForDate(userId: string, date: string): Promise<HabitCompletion[]> {
    return this.db.withUserId(userId, async (db) => {
      return db
        .select()
        .from(this.db.schema.habitCompletions)
        .where(
          and(
            eq(this.db.schema.habitCompletions.userId, userId),
            eq(this.db.schema.habitCompletions.completionDate, date)
          )
        );
    });
  }

  async updateLongestStreak(userId: string, habitId: string, currentStreak: number): Promise<void> {
    await this.db.withUserId(userId, async (db) => {
      // Get current longest streak
      const [habit] = await db
        .select({ longestStreak: this.db.schema.habits.longestStreak })
        .from(this.db.schema.habits)
        .where(
          and(
            eq(this.db.schema.habits.id, habitId),
            eq(this.db.schema.habits.userId, userId)
          )
        )
        .limit(1);

      if (habit && currentStreak > habit.longestStreak) {
        await db
          .update(this.db.schema.habits)
          .set({
            longestStreak: currentStreak,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(this.db.schema.habits.id, habitId),
              eq(this.db.schema.habits.userId, userId)
            )
          );
      }
    });
  }
}
