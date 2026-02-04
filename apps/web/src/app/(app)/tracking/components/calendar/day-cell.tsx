'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CalendarDaySummary } from '../../types';

interface DayCellProps {
  /** Day number (1-31) */
  day: number;
  /** Full date string (YYYY-MM-DD) */
  date: string;
  /** Today's date in YYYY-MM-DD format (from parent, timezone-aware) */
  today: string;
  /** Calendar data for this day */
  daySummary?: CalendarDaySummary;
  /** Whether this day is in the current month */
  isCurrentMonth: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Animation delay for staggered entrance (in seconds) */
  animationDelay?: number;
}

/**
 * Get fill color and percentage based on mood and habit completion
 */
function getDayFill(
  moodColor: string,
  habitsCompleted: number,
  habitsTotal: number,
  hasData: boolean
): { color: string; percent: number } {
  if (!hasData) {
    return { color: 'var(--muted)', percent: 0 };
  }

  // Calculate day score: prioritize habits completion
  const habitPercent = habitsTotal > 0 ? (habitsCompleted / habitsTotal) * 100 : 0;

  // Fill percentage based on habit completion (min 20% if any data exists)
  const percent = hasData ? Math.max(20, habitPercent) : 0;

  // Color based on mood
  const colorMap: Record<string, string> = {
    green: 'oklch(0.76 0.17 145 / 0.35)',
    yellow: 'oklch(0.80 0.15 85 / 0.35)',
    red: 'oklch(0.65 0.20 25 / 0.35)',
    gray: 'oklch(0.70 0 0 / 0.15)',
  };

  return { color: colorMap[moodColor] ?? colorMap.gray, percent };
}

/**
 * Check if date is in the future
 */
function isFutureDate(dateStr: string, today: string): boolean {
  return dateStr > today;
}

/**
 * DayCell - Individual day cell in the calendar grid
 *
 * Features:
 * - Day number with fill-based visualization (Year in Pixels style)
 * - Gradient fill from bottom based on mood + habit completion
 * - Visual distinction: Today (pulsing), Past (filled), Future (dashed)
 * - Habit completion dots
 * - Staggered entrance animation
 *
 * @see docs/specs/domains/tracking.md §3.2 for calendar format
 */
export function DayCell({
  day,
  date,
  today,
  daySummary,
  isCurrentMonth,
  onClick,
  animationDelay = 0,
}: DayCellProps) {
  const isCurrentDay = date === today;
  const isFuture = isFutureDate(date, today);
  const hasData = daySummary?.hasData ?? false;
  const moodColor = daySummary?.moodColor ?? 'gray';
  const habitsCompleted = daySummary?.habitsCompleted ?? 0;
  const habitsTotal = daySummary?.habitsTotal ?? 0;

  // Calculate fill visualization
  const { color: fillColor, percent: fillPercent } = getDayFill(
    moodColor,
    habitsCompleted,
    habitsTotal,
    hasData
  );

  // Generate habit indicator dots (max 5 visible)
  const maxDots = Math.min(habitsTotal, 5);
  const completedDots = Math.min(habitsCompleted, maxDots);

  // Disable interaction for future days and other months
  const isDisabled = !isCurrentMonth || isFuture;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        delay: animationDelay,
      }}
      whileHover={!isDisabled ? { scale: 1.05 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      className={cn(
        'relative flex flex-col items-center justify-start p-1 h-16 sm:h-20 rounded-lg transition-colors overflow-hidden',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        // Cursor and opacity based on state
        isDisabled ? 'cursor-default' : 'cursor-pointer',
        !isCurrentMonth && 'opacity-40',
        // Future days: dashed border, extra dim
        isCurrentMonth && isFuture && 'border border-dashed border-muted-foreground/30 opacity-50',
        // Today: ring with animation
        isCurrentDay && 'ring-2 ring-primary ring-offset-2'
      )}
      aria-label={`${day} - ${hasData ? 'tem dados' : isFuture ? 'dia futuro' : 'sem dados'}`}
    >
      {/* Fill background - gradient from bottom */}
      {isCurrentMonth && hasData && !isFuture && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: animationDelay + 0.1 }}
          style={{
            background: `linear-gradient(to top, ${fillColor} ${fillPercent}%, transparent ${fillPercent}%)`,
          }}
        />
      )}

      {/* Today indicator - pulsing glow */}
      {isCurrentDay && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-primary/10"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Day number */}
      <span
        className={cn(
          'relative z-10 text-sm font-medium',
          isCurrentDay && 'text-primary font-bold',
          !isCurrentMonth && 'text-muted-foreground',
          isFuture && isCurrentMonth && 'text-muted-foreground/60'
        )}
      >
        {day}
      </span>

      {/* Mood indicator - small dot instead of large circle */}
      {isCurrentMonth && !isFuture && (
        <div
          className={cn(
            'relative z-10 w-2 h-2 rounded-full mt-1.5',
            moodColor === 'green' && 'bg-green-500',
            moodColor === 'yellow' && 'bg-yellow-500',
            moodColor === 'red' && 'bg-red-500',
            moodColor === 'gray' && 'bg-muted-foreground/30'
          )}
          title={
            daySummary?.moodScore !== undefined
              ? `Humor: ${daySummary.moodScore}/10`
              : 'Sem registro de humor'
          }
        />
      )}

      {/* Habit completion dots */}
      {isCurrentMonth && habitsTotal > 0 && !isFuture && (
        <div className="relative z-10 flex gap-0.5 mt-1">
          {Array.from({ length: maxDots }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
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

      {/* Future day indicator */}
      {isCurrentMonth && isFuture && (
        <span className="relative z-10 text-[10px] text-muted-foreground/50 mt-auto mb-1">
          •••
        </span>
      )}
    </motion.button>
  );
}
