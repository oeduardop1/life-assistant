'use client';

import { TrendingUp, TrendingDown, Calendar, Banknote, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, type DebtProgress, type DebtProjection } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface DebtStatsProps {
  progress: DebtProgress;
  installmentAmount: number;
  dueDay: number | null;
  projection?: DebtProjection | null;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * DebtStats - Grid display of debt statistics for negotiated debts
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtStats({
  progress,
  installmentAmount,
  dueDay,
  projection,
  className,
}: DebtStatsProps) {
  const stats = [
    {
      label: 'Parcelas Pagas',
      value: progress.paidInstallments.toString(),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Parcelas Restantes',
      value: progress.remainingInstallments.toString(),
      icon: TrendingDown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Valor da Parcela',
      value: formatCurrency(installmentAmount),
      icon: Banknote,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Dia de Vencimento',
      value: dueDay ? `Dia ${dueDay}` : 'N/A',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className={cn('space-y-3', className)} data-testid="debt-stats">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-2"
            data-testid={`debt-stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <div className={cn('rounded-md p-1.5', stat.bgColor)}>
              <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
              <p className="text-sm font-medium">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Projection Message */}
      {projection && projection.message && (
        <div
          className="flex items-start gap-2 p-2 rounded-md bg-blue-500/5 border border-blue-500/10"
          data-testid="debt-projection"
        >
          <Target className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">{projection.message}</p>
        </div>
      )}
    </div>
  );
}
