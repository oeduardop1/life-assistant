'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface InvestmentProgressBarProps {
  currentAmount: number;
  goalAmount: number | null;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Progress bar for investment goal tracking
 * Shows percentage of goal achieved and optional label
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function InvestmentProgressBar({
  currentAmount,
  goalAmount,
  showLabel = false,
  size = 'md',
}: InvestmentProgressBarProps) {
  // No progress bar if no goal is set
  if (!goalAmount || goalAmount <= 0) {
    return null;
  }

  const progressPercent = Math.min((currentAmount / goalAmount) * 100, 100);
  const isComplete = progressPercent >= 100;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="space-y-1" data-testid="investment-progress-bar">
      <Progress
        value={progressPercent}
        className={cn(heightClasses[size], isComplete && '[&>div]:bg-green-500')}
        data-testid="investment-progress-value"
      />
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span data-testid="investment-progress-percent">
            {progressPercent.toFixed(1)}%
          </span>
          <span data-testid="investment-progress-label">
            {isComplete ? 'Meta atingida!' : 'da meta'}
          </span>
        </div>
      )}
    </div>
  );
}
