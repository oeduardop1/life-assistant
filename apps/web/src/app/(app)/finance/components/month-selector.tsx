'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getCurrentMonthInTimezone } from '../types';
import { useUserTimezone } from '@/hooks/use-user-timezone';

interface MonthSelectorProps {
  currentMonth: string;
  formattedMonth: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth?: () => void;
}

/**
 * MonthSelector - Enhanced navigation component for selecting month
 *
 * Features:
 * - Calendar icon with month name
 * - Visual indicator (pulsing dot) when not viewing current month
 * - Improved click area and hover states
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function MonthSelector({
  currentMonth,
  formattedMonth,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
}: MonthSelectorProps) {
  const timezone = useUserTimezone();
  const isCurrentMonth = currentMonth === getCurrentMonthInTimezone(timezone);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevMonth}
        aria-label="Mês anterior"
        data-testid="month-selector-prev"
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <button
        onClick={onCurrentMonth}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
          'text-sm font-medium',
          'hover:bg-muted',
          !isCurrentMonth && 'bg-muted/50'
        )}
        title={isCurrentMonth ? 'Mês atual' : 'Clique para ir ao mês atual'}
        data-testid="month-selector-current"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="min-w-[120px] text-center">{formattedMonth}</span>

        {/* Indicator when not current month */}
        <AnimatePresence>
          {!isCurrentMonth && (
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
        onClick={onNextMonth}
        aria-label="Próximo mês"
        data-testid="month-selector-next"
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
