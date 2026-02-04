'use client';

import { AlertTriangle, Clock, CalendarClock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency, getDaysUntilDue, getTodayInTimezone, type Bill } from '../../types';
import { useUserTimezone } from '@/hooks/use-user-timezone';

// =============================================================================
// Types
// =============================================================================

interface AlertItem {
  id: string;
  type: 'overdue' | 'due_soon' | 'due_today';
  message: string;
  subMessage?: string;
  billId: string;
}

interface BillAlertsProps {
  bills: Bill[];
  onBillClick?: (billId: string) => void;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateAlerts(bills: Bill[], today: string): AlertItem[] {
  const alerts: AlertItem[] = [];

  // Filter out paid and canceled bills
  const pendingBills = bills.filter(
    (b) => b.status === 'pending' || b.status === 'overdue'
  );

  for (const bill of pendingBills) {
    const daysUntil = getDaysUntilDue(bill.monthYear, bill.dueDay, today);
    const isOverdue = bill.status === 'overdue' || daysUntil < 0;

    if (isOverdue) {
      alerts.push({
        id: `overdue-${bill.id}`,
        type: 'overdue',
        message: `${bill.name} vencida`,
        subMessage: formatCurrency(bill.amount),
        billId: bill.id,
      });
    } else if (daysUntil === 0) {
      alerts.push({
        id: `today-${bill.id}`,
        type: 'due_today',
        message: `${bill.name} vence hoje`,
        subMessage: formatCurrency(bill.amount),
        billId: bill.id,
      });
    } else if (daysUntil > 0 && daysUntil <= 7) {
      alerts.push({
        id: `soon-${bill.id}`,
        type: 'due_soon',
        message: `${bill.name} vence em ${daysUntil} dia${daysUntil > 1 ? 's' : ''}`,
        subMessage: formatCurrency(bill.amount),
        billId: bill.id,
      });
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
 * BillAlerts - Contextual alerts for overdue and upcoming due dates
 *
 * Features:
 * - Shows overdue bills prominently
 * - Highlights bills due today
 * - Warns about bills due within 7 days
 * - Clickable to navigate/highlight bill
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function BillAlerts({
  bills,
  onBillClick,
  className,
}: BillAlertsProps) {
  const timezone = useUserTimezone();
  const today = getTodayInTimezone(timezone);
  const alerts = generateAlerts(bills, today);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      data-testid="bill-alerts"
      role="alert"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {alerts.slice(0, 4).map((alert) => (
          <AlertBadge
            key={alert.id}
            alert={alert}
            onClick={() => onBillClick?.(alert.billId)}
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

// =============================================================================
// Summary Alert Banner
// =============================================================================

interface BillAlertBannerProps {
  bills: Bill[];
  onQuickPayClick?: () => void;
  className?: string;
}

/**
 * BillAlertBanner - Prominent banner for overdue/due today bills
 */
export function BillAlertBanner({
  bills,
  onQuickPayClick,
  className,
}: BillAlertBannerProps) {
  const timezone = useUserTimezone();
  const today = getTodayInTimezone(timezone);
  const overdueBills = bills.filter((b) => b.status === 'overdue');
  const dueTodayBills = bills.filter((b) => {
    if (b.status !== 'pending') return false;
    const daysUntil = getDaysUntilDue(b.monthYear, b.dueDay, today);
    return daysUntil === 0;
  });

  const totalOverdue = overdueBills.reduce((sum, b) => {
    const amount = typeof b.amount === 'string' ? parseFloat(b.amount) : b.amount;
    return sum + amount;
  }, 0);

  const totalDueToday = dueTodayBills.reduce((sum, b) => {
    const amount = typeof b.amount === 'string' ? parseFloat(b.amount) : b.amount;
    return sum + amount;
  }, 0);

  if (overdueBills.length === 0 && dueTodayBills.length === 0) {
    return null;
  }

  const isOverdue = overdueBills.length > 0;
  const count = isOverdue ? overdueBills.length : dueTodayBills.length;
  const total = isOverdue ? totalOverdue : totalDueToday;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center justify-between gap-4 p-4 rounded-xl border',
        isOverdue
          ? 'bg-destructive/10 border-destructive/20'
          : 'bg-amber-500/10 border-amber-500/20',
        className
      )}
      data-testid="bill-alert-banner"
    >
      <div className="flex items-center gap-3">
        {isOverdue ? (
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        ) : (
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
        )}
        <div>
          <p className={cn(
            'font-medium',
            isOverdue ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'
          )}>
            {count} {count === 1 ? 'conta' : 'contas'} {isOverdue ? 'vencidas' : 'vencem hoje'}
          </p>
          <p className="text-sm text-muted-foreground">
            Totalizando {formatCurrency(total)}
          </p>
        </div>
      </div>
      {onQuickPayClick && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onQuickPayClick}
          className={cn(
            'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
            isOverdue
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          )}
        >
          Pagar Agora
        </motion.button>
      )}
    </motion.div>
  );
}
