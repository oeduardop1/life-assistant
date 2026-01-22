'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentMonth } from '../types';

interface MonthSelectorProps {
  currentMonth: string;
  formattedMonth: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth?: () => void;
}

/**
 * MonthSelector - Navigation component for selecting month
 *
 * Displays current month with prev/next navigation buttons.
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function MonthSelector({
  currentMonth,
  formattedMonth,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
}: MonthSelectorProps) {
  const isCurrentMonth = currentMonth === getCurrentMonth();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrevMonth}
        aria-label="Mês anterior"
        data-testid="month-selector-prev"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <button
        onClick={onCurrentMonth}
        className="min-w-[150px] text-center text-sm font-medium hover:text-primary transition-colors"
        title={isCurrentMonth ? 'Mês atual' : 'Clique para ir ao mês atual'}
        data-testid="month-selector-current"
      >
        {formattedMonth}
      </button>

      <Button
        variant="outline"
        size="icon"
        onClick={onNextMonth}
        aria-label="Próximo mês"
        data-testid="month-selector-next"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
