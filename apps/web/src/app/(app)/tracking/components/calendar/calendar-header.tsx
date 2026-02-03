'use client';

import { dayOfWeekLabels } from '../../types';

/**
 * CalendarHeader - Days of week header for the calendar grid
 *
 * Displays Sun-Sat labels in Portuguese
 */
export function CalendarHeader() {
  return (
    <div className="grid grid-cols-7 gap-1 mb-1">
      {dayOfWeekLabels.map((day) => (
        <div
          key={day}
          className="text-center text-xs font-medium text-muted-foreground py-2"
        >
          {day}
        </div>
      ))}
    </div>
  );
}
