'use client';

import { AlertTriangle, Clock, CalendarClock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency, getDebtDaysUntilDue, getTodayInTimezone, type Debt, type UpcomingInstallmentItem } from '../../types';
import { useUserTimezone } from '@/hooks/use-user-timezone';

// =============================================================================
// Types
// =============================================================================

interface AlertItem {
  id: string;
  type: 'overdue' | 'due_soon' | 'due_today';
  message: string;
  subMessage?: string;
  debtId: string;
}

interface DebtAlertsProps {
  debts: Debt[];
  upcomingInstallments?: UpcomingInstallmentItem[];
  currentMonth: string;
  onDebtClick?: (debtId: string) => void;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateAlerts(
  debts: Debt[],
  upcomingInstallments: UpcomingInstallmentItem[] | undefined,
  today: string
): AlertItem[] {
  const alerts: AlertItem[] = [];

  // Check for overdue debts
  const overdueDebts = debts.filter((d) => d.status === 'overdue');
  for (const debt of overdueDebts) {
    alerts.push({
      id: `overdue-${debt.id}`,
      type: 'overdue',
      message: `${debt.name} em atraso`,
      subMessage: debt.creditor ? `${debt.creditor}` : undefined,
      debtId: debt.id,
    });
  }

  // Check upcoming installments
  if (upcomingInstallments) {
    const overdueInstallments = upcomingInstallments.filter(
      (i) => i.status === 'overdue'
    );
    const pendingInstallments = upcomingInstallments.filter(
      (i) => i.status === 'pending'
    );

    // Add overdue installment alerts (if not already covered by debt status)
    for (const inst of overdueInstallments) {
      if (!overdueDebts.find((d) => d.id === inst.debtId)) {
        alerts.push({
          id: `overdue-inst-${inst.debtId}`,
          type: 'overdue',
          message: `Parcela ${inst.installmentNumber}/${inst.totalInstallments} vencida`,
          subMessage: `${inst.debtName} - ${formatCurrency(inst.amount)}`,
          debtId: inst.debtId,
        });
      }
    }

    // Add due soon alerts (within 7 days)
    for (const inst of pendingInstallments) {
      const daysUntil = getDebtDaysUntilDue(inst.dueDay, today);

      if (daysUntil === 0) {
        alerts.push({
          id: `today-${inst.debtId}`,
          type: 'due_today',
          message: `Parcela vence hoje`,
          subMessage: `${inst.debtName} - ${formatCurrency(inst.amount)}`,
          debtId: inst.debtId,
        });
      } else if (daysUntil > 0 && daysUntil <= 7) {
        alerts.push({
          id: `soon-${inst.debtId}`,
          type: 'due_soon',
          message: `Vence em ${daysUntil} dia${daysUntil > 1 ? 's' : ''}`,
          subMessage: `${inst.debtName} - ${formatCurrency(inst.amount)}`,
          debtId: inst.debtId,
        });
      }
    }
  } else {
    // Fallback: check debts directly for due soon
    const activeDebts = debts.filter(
      (d) => d.status === 'active' && d.isNegotiated && d.dueDay
    );

    for (const debt of activeDebts) {
      const daysUntil = getDebtDaysUntilDue(debt.dueDay!, today);

      if (daysUntil === 0) {
        alerts.push({
          id: `today-${debt.id}`,
          type: 'due_today',
          message: `Parcela vence hoje`,
          subMessage: `${debt.name} - ${formatCurrency(debt.installmentAmount!)}`,
          debtId: debt.id,
        });
      } else if (daysUntil > 0 && daysUntil <= 7) {
        alerts.push({
          id: `soon-${debt.id}`,
          type: 'due_soon',
          message: `Vence em ${daysUntil} dia${daysUntil > 1 ? 's' : ''}`,
          subMessage: `${debt.name} - ${formatCurrency(debt.installmentAmount!)}`,
          debtId: debt.id,
        });
      }
    }
  }

  // Sort: overdue first, then due_today, then due_soon
  const priority = { overdue: 0, due_today: 1, due_soon: 2 };
  alerts.sort((a, b) => priority[a.type] - priority[b.type]);

  return alerts;
}

// =============================================================================
// Alert Badge Component
// =============================================================================

interface AlertBadgeProps {
  alert: AlertItem;
  onClick?: () => void;
}

function AlertBadge({ alert, onClick }: AlertBadgeProps) {
  const config = {
    overdue: {
      icon: AlertTriangle,
      bg: 'bg-destructive/10 hover:bg-destructive/15 border-destructive/20',
      text: 'text-destructive',
      iconColor: 'text-destructive',
    },
    due_today: {
      icon: Clock,
      bg: 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      iconColor: 'text-amber-600 dark:text-amber-500',
    },
    due_soon: {
      icon: CalendarClock,
      bg: 'bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20',
      text: 'text-blue-700 dark:text-blue-400',
      iconColor: 'text-blue-600 dark:text-blue-500',
    },
  };

  const { icon: Icon, bg, text, iconColor } = config[alert.type];

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer',
        bg
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', iconColor)} />
      <div className="flex flex-col items-start text-left min-w-0">
        <span className={cn('text-sm font-medium', text)}>{alert.message}</span>
        {alert.subMessage && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {alert.subMessage}
          </span>
        )}
      </div>
    </motion.button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * DebtAlerts - Contextual alerts for overdue and upcoming due dates
 *
 * Features:
 * - Shows overdue debts/installments prominently
 * - Highlights installments due today
 * - Warns about installments due within 7 days
 * - Clickable to navigate to debt
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtAlerts({
  debts,
  upcomingInstallments,
  onDebtClick,
  className,
}: DebtAlertsProps) {
  const timezone = useUserTimezone();
  const today = getTodayInTimezone(timezone);
  const alerts = generateAlerts(debts, upcomingInstallments, today);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      data-testid="debt-alerts"
      role="alert"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {alerts.slice(0, 4).map((alert) => (
          <AlertBadge
            key={alert.id}
            alert={alert}
            onClick={() => onDebtClick?.(alert.debtId)}
          />
        ))}
        {alerts.length > 4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center px-3 py-2 text-sm text-muted-foreground"
          >
            +{alerts.length - 4} mais
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
