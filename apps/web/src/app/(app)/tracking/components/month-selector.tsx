'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMonthDisplay, isCurrentMonth } from '../types';
import { useTracking } from '../context/tracking-context';

/**
 * MonthSelector - Navigation component for selecting month in tracking calendar
 *
 * Features:
 * - Calendar icon with month name
 * - Visual indicator (pulsing dot) when not viewing current month
 * - Improved click area and hover states
 *
 * @see docs/specs/domains/tracking.md §3.2 for calendar navigation
 */
export function MonthSelector() {
  const { currentMonth, goToPreviousMonth, goToNextMonth, goToToday } =
    useTracking();

  const formattedMonth = formatMonthDisplay(currentMonth);
  const isCurrentMonthView = isCurrentMonth(currentMonth);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPreviousMonth}
        aria-label="Mês anterior"
        data-testid="month-selector-prev"
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <button
        onClick={goToToday}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
          'text-sm font-medium',
          'hover:bg-muted',
          !isCurrentMonthView && 'bg-muted/50'
        )}
        title={
          isCurrentMonthView ? 'Mês atual' : 'Clique para ir ao mês atual'
        }
        data-testid="month-selector-current"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="min-w-[120px] text-center">{formattedMonth}</span>

        {/* Indicator when not current month */}
        <AnimatePresence>
          {!isCurrentMonthView && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="relative flex h-2 w-2"
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <Button
        variant="ghost"
        size="icon"
        onClick={goToNextMonth}
        aria-label="Próximo mês"
        data-testid="month-selector-next"
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
