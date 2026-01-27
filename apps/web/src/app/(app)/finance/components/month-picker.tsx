'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatMonthDisplay, getPreviousMonth, getNextMonth } from '../types';

interface MonthPickerProps {
  value: string;
  onChange: (month: string) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  'data-testid'?: string;
}

/**
 * MonthPicker - Form input for selecting a month (YYYY-MM)
 *
 * Displays month with prev/next navigation buttons.
 * Designed for use in forms with react-hook-form.
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function MonthPicker({
  value,
  onChange,
  label,
  description,
  disabled,
  'data-testid': testId,
}: MonthPickerProps) {
  const handlePrev = () => {
    if (!disabled) {
      onChange(getPreviousMonth(value));
    }
  };

  const handleNext = () => {
    if (!disabled) {
      onChange(getNextMonth(value));
    }
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handlePrev}
          disabled={disabled}
          aria-label="Mês anterior"
          data-testid={testId ? `${testId}-prev` : undefined}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span
          className="min-w-[140px] text-center text-sm font-medium"
          data-testid={testId ? `${testId}-value` : undefined}
        >
          {formatMonthDisplay(value)}
        </span>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={disabled}
          aria-label="Próximo mês"
          data-testid={testId ? `${testId}-next` : undefined}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
