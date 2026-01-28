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
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { kpiColors, kpiBgColors, kpiBorderColors, formatCurrency, type FinanceKPI } from '../types';

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
  /** Hero variant: full-width with larger text and contextual message */
  variant?: 'standard' | 'hero';
  /** Contextual message shown in hero variant */
  message?: string;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function KPICardSkeleton({ variant = 'standard' }: { variant?: 'standard' | 'hero' }) {
  if (variant === 'hero') {
    return (
      <Card data-testid="finance-kpi-card-loading" className="col-span-full">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="finance-kpi-card-loading">
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Hero Variant
// =============================================================================

interface HeroKPICardProps {
  title: string;
  value: number;
  color: FinanceKPI['color'];
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  message?: string;
  formatAsCurrency?: boolean;
}

function HeroKPICard({
  title,
  value,
  color,
  trend,
  message,
  formatAsCurrency = true,
}: HeroKPICardProps) {
  const formattedValue = formatAsCurrency
    ? formatCurrency(value)
    : value.toLocaleString('pt-BR');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="col-span-full"
    >
      <Card
        data-testid="finance-kpi-card-hero"
        className={cn(
          'border-l-4 transition-shadow hover:shadow-md',
          kpiBorderColors[color]
        )}
      >
        <CardContent className="p-6">
          <div className="flex flex-col gap-2">
            {/* Header with title and trend */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {trend && (
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    trend.direction === 'up' && 'bg-green-500/10 text-green-600 dark:text-green-400',
                    trend.direction === 'down' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                    trend.direction === 'neutral' && 'bg-muted text-muted-foreground'
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

            {/* Large value */}
            <p
              className={cn(
                'text-4xl sm:text-5xl font-bold font-mono tracking-tight',
                kpiColors[color]
              )}
            >
              {formattedValue}
            </p>

            {/* Contextual message */}
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// Standard Variant
// =============================================================================

interface StandardKPICardProps {
  title: string;
  value: number;
  icon: string;
  color: FinanceKPI['color'];
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  formatAsCurrency?: boolean;
  suffix?: string;
}

function StandardKPICard({
  title,
  value,
  icon,
  color,
  trend,
  formatAsCurrency = true,
  suffix,
}: StandardKPICardProps) {
  const Icon = iconMap[icon] ?? Wallet;

  const formattedValue = formatAsCurrency
    ? formatCurrency(value)
    : suffix
      ? `${value.toLocaleString('pt-BR')}${suffix}`
      : value.toLocaleString('pt-BR');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Card
        data-testid="finance-kpi-card"
        className={cn(
          'h-full border-l-4 transition-all hover:shadow-md',
          kpiBorderColors[color]
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p
                className={cn(
                  'text-xl font-bold font-mono tabular-nums',
                  kpiColors[color]
                )}
              >
                {formattedValue}
              </p>
              {trend && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    trend.direction === 'up' && 'text-green-600 dark:text-green-400',
                    trend.direction === 'down' && 'text-red-600 dark:text-red-400',
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
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * FinanceKPICard - Displays a single KPI metric
 *
 * Variants:
 * - `standard`: Compact card with icon, value, title, and trend (vertical layout)
 * - `hero`: Full-width card for primary metric (balance) with large text and message
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
  variant = 'standard',
  message,
}: FinanceKPICardProps) {
  if (loading) {
    return <KPICardSkeleton variant={variant} />;
  }

  if (variant === 'hero') {
    return (
      <HeroKPICard
        title={title}
        value={value}
        color={color}
        trend={trend}
        message={message}
        formatAsCurrency={formatAsCurrency}
      />
    );
  }

  return (
    <StandardKPICard
      title={title}
      value={value}
      icon={icon}
      color={color}
      trend={trend}
      formatAsCurrency={formatAsCurrency}
      suffix={suffix}
    />
  );
}

// =============================================================================
// KPI Cards Grid
// =============================================================================

interface FinanceKPICardsGridProps {
  children: React.ReactNode;
}

/**
 * Grid container for KPI cards - 2 columns on mobile, 3 on desktop
 */
export function FinanceKPICardsGrid({ children }: FinanceKPICardsGridProps) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 gap-4"
      data-testid="finance-kpi-cards-grid"
    >
      {children}
    </div>
  );
}
