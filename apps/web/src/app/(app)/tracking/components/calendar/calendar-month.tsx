'use client';

import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarHeader } from './calendar-header';
import { DayCell } from './day-cell';
import { useTracking } from '../../context/tracking-context';
import { useCalendarMonthData } from '../../hooks/use-calendar';
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  getPreviousMonth,
  getNextMonth,
  parseMonthYear,
} from '../../types';

interface CalendarDay {
  day: number;
  date: string;
  isCurrentMonth: boolean;
}

/**
 * CalendarMonth - Monthly calendar grid with day summaries
 *
 * Features:
 * - 7 columns (Sun-Sat) x 6 rows grid
 * - Current month days with data indicators
 * - Previous/next month days (dimmed)
 * - Click on day opens day detail
 *
 * @see docs/specs/domains/tracking.md §3.2 for calendar format
 */
export function CalendarMonth() {
  const { currentMonth, year, month, setSelectedDate } = useTracking();
  const { isLoading, isError, getDay } = useCalendarMonthData(year, month);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const result: CalendarDay[] = [];

    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfWeek = getFirstDayOfMonth(year, month);

    // Previous month padding
    const prevMonth = parseMonthYear(getPreviousMonth(currentMonth));
    const daysInPrevMonth = getDaysInMonth(prevMonth.year, prevMonth.month);

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = `${prevMonth.year}-${String(prevMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      result.push({ day, date, isCurrentMonth: false });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      result.push({ day, date, isCurrentMonth: true });
    }

    // Next month padding (fill to 42 cells = 6 rows)
    const nextMonth = parseMonthYear(getNextMonth(currentMonth));
    const remaining = 42 - result.length;

    for (let day = 1; day <= remaining; day++) {
      const date = `${nextMonth.year}-${String(nextMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      result.push({ day, date, isCurrentMonth: false });
    }

    return result;
  }, [year, month, currentMonth]);

  // Handle day click
  const handleDayClick = (date: string, isCurrentMonth: boolean) => {
    if (isCurrentMonth) {
      setSelectedDate(date);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <CalendarHeader />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <Skeleton key={i} className="h-16 sm:h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Erro ao carregar calendário. Tente novamente.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <CalendarHeader />
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((calDay) => (
          <DayCell
            key={calDay.date}
            day={calDay.day}
            date={calDay.date}
            daySummary={getDay(calDay.date)}
            isCurrentMonth={calDay.isCurrentMonth}
            onClick={() => handleDayClick(calDay.date, calDay.isCurrentMonth)}
          />
        ))}
      </div>
    </div>
  );
}
