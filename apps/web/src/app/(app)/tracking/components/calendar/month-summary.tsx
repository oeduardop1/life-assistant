'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Smile, CheckCircle2, Calendar } from 'lucide-react';
import type { CalendarDaySummary } from '../../types';
import { formatDateISO } from '@life-assistant/shared';

interface MonthSummaryProps {
  /** Calendar days data for the month */
  days: CalendarDaySummary[];
  /** Year of the month */
  year: number;
  /** Month number (1-12) */
  month: number;
  /** Today's date in YYYY-MM-DD format (timezone-aware) */
  today: string;
}

interface MonthStats {
  /** Average mood score for days with data */
  avgMood: number | null;
  /** Habit completion percentage (total completed / total possible) */
  habitPercent: number;
  /** Days with any tracking data */
  daysTracked: number;
  /** Total days in the month up to today (or full month if past) */
  totalDays: number;
  /** Current streak of consecutive days with data */
  currentStreak: number;
}

/**
 * Calculate month statistics from calendar day data
 */
function calculateMonthStats(
  days: CalendarDaySummary[],
  year: number,
  month: number,
  today: string
): MonthStats {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const isCurrentMonth = today.startsWith(monthStr);
  const isPastMonth = today > `${monthStr}-31`;

  // Filter to current month days only
  const monthDays = days.filter((d) => d.date.startsWith(monthStr));

  // Calculate total days (up to today for current month, full month for past)
  let totalDays: number;
  if (isCurrentMonth) {
    const todayDay = parseInt(today.split('-')[2] ?? '1', 10);
    totalDays = todayDay;
  } else if (isPastMonth) {
    totalDays = new Date(year, month, 0).getDate();
  } else {
    // Future month
    totalDays = 0;
  }

  // Days with data
  const daysWithData = monthDays.filter((d) => d.hasData && d.date <= today);
  const daysTracked = daysWithData.length;

  // Average mood
  const moodScores = daysWithData
    .filter((d) => d.moodScore !== undefined)
    .map((d) => d.moodScore!);
  const avgMood =
    moodScores.length > 0
      ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length
      : null;

  // Habit completion percentage
  const totalHabitsCompleted = daysWithData.reduce(
    (sum, d) => sum + d.habitsCompleted,
    0
  );
  const totalHabitsPossible = daysWithData.reduce(
    (sum, d) => sum + d.habitsTotal,
    0
  );
  const habitPercent =
    totalHabitsPossible > 0
      ? Math.round((totalHabitsCompleted / totalHabitsPossible) * 100)
      : 0;

  // Current streak (consecutive days with data from today backwards)
  let currentStreak = 0;
  const sortedDays = [...daysWithData].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Check from today backwards
  // Parse today string to get a date object for iteration
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  const checkDate = new Date(todayYear!, todayMonth! - 1, todayDay!);

  for (const dayData of sortedDays) {
    // Format checkDate as YYYY-MM-DD without using toISOString (which converts to UTC)
    const checkDateStr = formatDateISO(checkDate, 'UTC'); // Using UTC since we're just doing date arithmetic

    if (dayData.date === checkDateStr && dayData.hasData) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dayData.date < checkDateStr) {
      // Gap found, stop counting
      break;
    }
  }

  return {
    avgMood,
    habitPercent,
    daysTracked,
    totalDays,
    currentStreak,
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
} as const;

/**
 * MonthSummary - Displays aggregate statistics for the current month
 *
 * Shows:
 * - Current streak (consecutive days with data)
 * - Average mood score
 * - Habit completion percentage
 * - Days tracked count
 *
 * @see docs/specs/domains/tracking.md §3.2 for calendar UI
 */
export function MonthSummary({ days, year, month, today }: MonthSummaryProps) {
  const stats = useMemo(
    () => calculateMonthStats(days, year, month, today),
    [days, year, month, today]
  );

  // Don't show if no data at all
  if (stats.totalDays === 0) {
    return null;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-card/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 mb-4 border"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Current Streak */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 sm:gap-3"
        >
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-500/10">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-xl font-bold tabular-nums">
              {stats.currentStreak}
              <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-1">
                {stats.currentStreak === 1 ? 'dia' : 'dias'}
              </span>
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              streak atual
            </p>
          </div>
        </motion.div>

        {/* Average Mood */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 sm:gap-3"
        >
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-500/10">
            <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-xl font-bold tabular-nums">
              {stats.avgMood !== null ? stats.avgMood.toFixed(1) : '—'}
              {stats.avgMood !== null && (
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  /10
                </span>
              )}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              humor médio
            </p>
          </div>
        </motion.div>

        {/* Habit Completion */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 sm:gap-3"
        >
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-500/10">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-xl font-bold tabular-nums">
              {stats.habitPercent}
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                %
              </span>
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              hábitos
            </p>
          </div>
        </motion.div>

        {/* Days Tracked */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 sm:gap-3"
        >
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/10">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-xl font-bold tabular-nums">
              {stats.daysTracked}
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                /{stats.totalDays}
              </span>
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              dias
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
