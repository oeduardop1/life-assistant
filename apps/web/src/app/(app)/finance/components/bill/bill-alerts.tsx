'use client';

import { AlertTriangle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency, getDaysUntilDue, getTodayInTimezone, type Bill } from '../../types';
import { useUserTimezone } from '@/hooks/use-user-timezone';

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
