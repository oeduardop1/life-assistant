'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { format, parseISO, startOfWeek, addDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { HabitCompletion, HabitFrequency } from '../../types';

interface CompletionHeatmapProps {
  /** Array of completions for this habit */
  completions: HabitCompletion[];
  /** Habit's color for completed dots */
  habitColor?: string | null;
  /** Habit's frequency to determine expected days */
  frequency: HabitFrequency;
  /** Custom frequency days (0=Sunday, 6=Saturday) */
  frequencyDays?: number[] | null;
  /** Number of weeks to display (default 12) */
  weeks?: number;
  /** End date for the heatmap (default today) */
  endDate?: string;
  /** Loading state */
  isLoading?: boolean;
}

interface DayData {
  date: string;
  dateObj: Date;
  isCompleted: boolean;
  isExpected: boolean;
  isFuture: boolean;
  completedAt?: string;
}

/**
 * CompletionHeatmap - 12-week grid visualization for habit completions
 *
 * Features:
 * - Shows last 12 weeks of completions
 * - Uses journal aesthetic (dashed for expected, solid for completed)
 * - Soft color gradient based on habit's color
 * - Hover shows date + completion time
 * - Respects reduced motion preferences
 * - Accounts for habit frequency (daily, weekdays, weekends, custom)
 */
export function CompletionHeatmap({
  completions,
  habitColor,
  frequency,
  frequencyDays,
  weeks = 12,
  endDate,
  isLoading,
}: CompletionHeatmapProps) {
  const prefersReducedMotion = useReducedMotion();

  // Build a Set of completed dates for quick lookup
  const completionMap = useMemo(() => {
    const map = new Map<string, HabitCompletion>();
    for (const completion of completions) {
      map.set(completion.completionDate, completion);
    }
    return map;
  }, [completions]);

  // Generate grid data: 12 weeks x 7 days
  const gridData = useMemo(() => {
    const today = endDate ? parseISO(endDate) : new Date();
    const totalDays = weeks * 7;

    // Start from the beginning of the week containing (today - totalDays)
    const startDate = startOfWeek(addDays(today, -totalDays + 1), { weekStartsOn: 0 });

    const rows: DayData[][] = [];

    // Build 7 rows (one per day of week)
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const row: DayData[] = [];

      for (let week = 0; week < weeks; week++) {
        const cellDate = addDays(startDate, week * 7 + dayOfWeek);
        const dateStr = format(cellDate, 'yyyy-MM-dd');
        const completion = completionMap.get(dateStr);

        row.push({
          date: dateStr,
          dateObj: cellDate,
          isCompleted: !!completion,
          isExpected: isExpectedDay(cellDate, frequency, frequencyDays),
          isFuture: isAfter(cellDate, today),
          completedAt: completion?.completedAt,
        });
      }

      rows.push(row);
    }

    return rows;
  }, [completionMap, frequency, frequencyDays, weeks, endDate]);

  // Get month labels for the header
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    // Use the first row to determine months
    gridData[0]?.forEach((day, weekIndex) => {
      const month = day.dateObj.getMonth();
      if (month !== lastMonth) {
        labels.push({
          label: format(day.dateObj, 'MMM', { locale: ptBR }),
          weekIndex,
        });
        lastMonth = month;
      }
    });

    return labels;
  }, [gridData]);

  if (isLoading) {
    return <CompletionHeatmapSkeleton weeks={weeks} />;
  }

  const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2">
        {/* Month labels */}
        <div className="flex pl-6">
          <div className="flex-1 relative h-4 text-xs text-muted-foreground">
            {monthLabels.map(({ label, weekIndex }) => (
              <span
                key={`${label}-${weekIndex}`}
                className="absolute capitalize"
                style={{ left: `${(weekIndex / weeks) * 100}%` }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex gap-1">
          {/* Day of week labels */}
          <div className="flex flex-col gap-[3px] pr-1">
            {dayLabels.map((label, i) => (
              <div
                key={i}
                className="h-3 w-4 text-[10px] text-muted-foreground flex items-center justify-end"
              >
                {i % 2 === 1 ? label : ''}
              </div>
            ))}
          </div>

          {/* Heatmap cells */}
          <div className="flex gap-[3px]">
            {Array.from({ length: weeks }).map((_, weekIndex) => (
              <motion.div
                key={weekIndex}
                className="flex flex-col gap-[3px]"
                initial={prefersReducedMotion ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: prefersReducedMotion ? 0 : weekIndex * 0.03,
                  duration: 0.2,
                }}
              >
                {gridData.map((row) => {
                  const day = row[weekIndex];
                  if (!day) return null;

                  return (
                    <HeatmapCell
                      key={day.date}
                      day={day}
                      habitColor={habitColor}
                    />
                  );
                })}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor: habitColor || 'var(--habit-dot-completed)',
              }}
            />
            <span>Completado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-[var(--habit-dot-missed)]" />
            <span>Esperado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-[var(--habit-dot-not-expected)]" />
            <span>N/A</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

interface HeatmapCellProps {
  day: DayData;
  habitColor?: string | null;
}

function HeatmapCell({ day, habitColor }: HeatmapCellProps) {
  const getCellStyle = () => {
    if (day.isFuture) {
      return {
        backgroundColor: 'var(--habit-dot-future)',
      };
    }
    if (day.isCompleted) {
      return {
        backgroundColor: habitColor || 'var(--habit-dot-completed)',
      };
    }
    if (day.isExpected) {
      return {
        backgroundColor: 'var(--habit-dot-missed)',
      };
    }
    return {
      backgroundColor: 'var(--habit-dot-not-expected)',
    };
  };

  const getTooltipText = () => {
    const dateFormatted = format(day.dateObj, "EEEE, d 'de' MMMM", { locale: ptBR });

    if (day.isFuture) {
      return `${dateFormatted} (futuro)`;
    }
    if (day.isCompleted && day.completedAt) {
      const time = format(parseISO(day.completedAt), 'HH:mm');
      return `${dateFormatted} - Completado às ${time}`;
    }
    if (day.isCompleted) {
      return `${dateFormatted} - Completado`;
    }
    if (day.isExpected) {
      return `${dateFormatted} - Não registrado`;
    }
    return `${dateFormatted} - Não esperado`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'h-3 w-3 rounded-sm transition-transform hover:scale-125 cursor-default',
            day.isExpected && !day.isCompleted && !day.isFuture && 'border border-dashed border-muted-foreground/20'
          )}
          style={getCellStyle()}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs capitalize">
        {getTooltipText()}
      </TooltipContent>
    </Tooltip>
  );
}

function CompletionHeatmapSkeleton({ weeks = 12 }: { weeks?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-1">
        <div className="w-4" />
        <div className="flex gap-[3px]">
          {Array.from({ length: weeks }).map((_, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <Skeleton key={dayIndex} className="h-3 w-3 rounded-sm" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Check if a date is an expected day for the habit based on frequency
 */
function isExpectedDay(
  date: Date,
  frequency: HabitFrequency,
  frequencyDays?: number[] | null
): boolean {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  switch (frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'custom':
      return frequencyDays ? frequencyDays.includes(dayOfWeek) : false;
    default:
      return true;
  }
}
