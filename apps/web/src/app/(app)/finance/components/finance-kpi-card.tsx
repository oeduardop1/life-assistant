'use client';

import type { LucideIcon } from 'lucide-react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShoppingCart,
  Wallet,
  PiggyBank,
  CreditCard,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { kpiColors, kpiBgColors, formatCurrency, type FinanceKPI } from '../types';

// =============================================================================
// Icon Map
// =============================================================================

const iconMap: Record<string, LucideIcon> = {
  TrendingUp,
  TrendingDown,
  Target,
  ShoppingCart,
  Wallet,
  PiggyBank,
  CreditCard,
  Calendar,
  CheckCircle,
};

// =============================================================================
// Props
// =============================================================================

interface FinanceKPICardProps {
  title: string;
  value: number;
  icon: string;
  color: FinanceKPI['color'];
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  loading?: boolean;
  formatAsCurrency?: boolean;
  suffix?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * FinanceKPICard - Displays a single KPI metric
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function FinanceKPICard({
  title,
  value,
  icon,
  color,
  trend,
  loading = false,
  formatAsCurrency = true,
  suffix,
}: FinanceKPICardProps) {
  const Icon = iconMap[icon] ?? Wallet;

  if (loading) {
    return (
      <Card data-testid="finance-kpi-card-loading">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedValue = formatAsCurrency
    ? formatCurrency(value)
    : suffix
      ? `${value.toLocaleString('pt-BR')}${suffix}`
      : value.toLocaleString('pt-BR');

  return (
    <Card data-testid="finance-kpi-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn('text-xl font-bold', kpiColors[color])}>
              {formattedValue}
            </p>
            {trend && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  trend.direction === 'up' && 'text-green-500',
                  trend.direction === 'down' && 'text-red-500',
                  trend.direction === 'neutral' && 'text-muted-foreground'
                )}
              >
                {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
                {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
                <span>
                  {trend.value > 0 ? '+' : ''}
                  {trend.value.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className={cn('rounded-lg p-2', kpiBgColors[color])}>
            <Icon className={cn('h-6 w-6', kpiColors[color])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// KPI Cards Grid
// =============================================================================

interface FinanceKPICardsGridProps {
  children: React.ReactNode;
}

/**
 * Grid container for KPI cards
 */
export function FinanceKPICardsGrid({ children }: FinanceKPICardsGridProps) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      data-testid="finance-kpi-cards-grid"
    >
      {children}
    </div>
  );
}
