'use client';

import { cn } from '@/lib/utils';
import type { CalendarDaySummary } from '../../types';
import { isToday, moodColorClasses } from '../../types';

interface DayCellProps {
  /** Day number (1-31) */
  day: number;
  /** Full date string (YYYY-MM-DD) */
  date: string;
  /** Calendar data for this day */
  daySummary?: CalendarDaySummary;
  /** Whether this day is in the current month */
  isCurrentMonth: boolean;
  /** Click handler */
  onClick?: () => void;
}

/**
 * DayCell - Individual day cell in the calendar grid
 *
 * Features:
 * - Day number
 * - Mood color indicator (🟢 ≥7 / 🟡 4-6 / 🔴 ≤3 / gray no data)
 * - Habit completion indicators (dots)
 * - Special border for today
 * - Dimmed style for other months
 *
 * @see docs/specs/domains/tracking.md §3.2 for calendar format
 */
export function DayCell({
  day,
  date,
  daySummary,
  isCurrentMonth,
  onClick,
}: DayCellProps) {
  const isCurrentDay = isToday(date);
  const hasData = daySummary?.hasData ?? false;
  const moodColor = daySummary?.moodColor ?? 'gray';
  const habitsCompleted = daySummary?.habitsCompleted ?? 0;
  const habitsTotal = daySummary?.habitsTotal ?? 0;

  // Generate habit indicator dots (max 5 visible)
  const maxDots = Math.min(habitsTotal, 5);
  const completedDots = Math.min(habitsCompleted, maxDots);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isCurrentMonth}
      className={cn(
        'relative flex flex-col items-center justify-start p-1 h-16 sm:h-20 rounded-lg transition-all',
        'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        isCurrentMonth ? 'cursor-pointer' : 'cursor-default opacity-40',
        isCurrentDay && 'ring-2 ring-primary ring-offset-1',
        hasData && isCurrentMonth && 'bg-muted/30'
      )}
      aria-label={`${day} - ${hasData ? 'tem dados' : 'sem dados'}`}
    >
      {/* Day number */}
      <span
        className={cn(
          'text-sm font-medium',
          isCurrentDay && 'text-primary font-bold',
          !isCurrentMonth && 'text-muted-foreground'
        )}
      >
        {day}
      </span>

      {/* Mood color indicator */}
      {isCurrentMonth && (
        <div
          className={cn(
            'w-4 h-4 rounded-full mt-1',
            moodColorClasses[moodColor]
          )}
          title={
            daySummary?.moodScore !== undefined
              ? `Humor: ${daySummary.moodScore}/10`
              : 'Sem registro de humor'
          }
        />
      )}

      {/* Habit completion dots */}
      {isCurrentMonth && habitsTotal > 0 && (
        <div className="flex gap-0.5 mt-1">
          {Array.from({ length: maxDots }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                i < completedDots ? 'bg-foreground' : 'bg-muted-foreground/30'
              )}
              title={
                i < completedDots
                  ? `Hábito ${i + 1} completo`
                  : `Hábito ${i + 1} pendente`
              }
            />
          ))}
          {habitsTotal > maxDots && (
            <span className="text-[8px] text-muted-foreground ml-0.5">
              +{habitsTotal - maxDots}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
