'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// =============================================================================
// Props
// =============================================================================

interface DebtProgressBarProps {
  /** Current installment number (1-based) */
  currentInstallment: number;
  /** Total number of installments */
  totalInstallments: number;
  /** Optional class name */
  className?: string;
  /** Show percentage label */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// =============================================================================
// Component
// =============================================================================

/**
 * DebtProgressBar - Visual progress indicator for debt installments
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtProgressBar({
  currentInstallment,
  totalInstallments,
  className,
  showLabel = false,
  size = 'md',
}: DebtProgressBarProps) {
  // Paid installments = currentInstallment - 1 (current is the next to pay)
  const paidInstallments = currentInstallment - 1;
  const progressPercent = totalInstallments > 0
    ? Math.min(100, Math.round((paidInstallments / totalInstallments) * 100))
    : 0;

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const getProgressColor = (percent: number): string => {
    if (percent >= 75) return 'bg-green-500';
    if (percent >= 50) return 'bg-blue-500';
    if (percent >= 25) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className={cn('w-full', className)} data-testid="debt-progress-bar">
      <div className="relative">
        <Progress
          value={progressPercent}
          className={cn(sizeClasses[size], '[&>div]:transition-all')}
          style={{
            // Override the indicator color based on progress
            ['--progress-color' as string]: getProgressColor(progressPercent),
          }}
        />
        {/* Custom indicator color overlay */}
        <div
          className={cn(
            'absolute top-0 left-0 rounded-full transition-all',
            sizeClasses[size],
            getProgressColor(progressPercent)
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {showLabel && (
        <div className="flex justify-between items-center mt-1">
          <span
            className="text-xs text-muted-foreground"
            data-testid="debt-progress-installments"
          >
            {paidInstallments}/{totalInstallments} parcelas
          </span>
          <span
            className="text-xs font-medium"
            data-testid="debt-progress-percent"
          >
            {progressPercent}%
          </span>
        </div>
      )}
    </div>
  );
}
