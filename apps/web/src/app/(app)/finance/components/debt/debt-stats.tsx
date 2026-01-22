'use client';

import { TrendingUp, TrendingDown, Calendar, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, type DebtProgress } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface DebtStatsProps {
  progress: DebtProgress;
  installmentAmount: number;
  dueDay: number | null;
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
    <div
      className={cn('grid grid-cols-2 gap-3', className)}
      data-testid="debt-stats"
    >
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
  );
}
