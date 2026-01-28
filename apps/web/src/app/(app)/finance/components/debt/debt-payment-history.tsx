'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency, formatMonthDisplay, type Debt } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface PaymentHistoryItem {
  installmentNumber: number;
  monthYear: string;
  amount: number;
  paidAt?: string;
  status: 'paid' | 'paid_early' | 'pending' | 'overdue';
  dueDay: number;
}

interface DebtPaymentHistoryProps {
  debt: Debt;
  children: React.ReactNode;
}

// =============================================================================
// Timeline Item Component
// =============================================================================

interface TimelineItemProps {
  item: PaymentHistoryItem;
  isLast: boolean;
  index: number;
}

function TimelineItem({ item, isLast, index }: TimelineItemProps) {
  const isPaid = item.status === 'paid' || item.status === 'paid_early';
  const isOverdue = item.status === 'overdue';

  const statusConfig = {
    paid: {
      icon: CheckCircle2,
      bg: 'bg-emerald-500',
      text: 'Paga',
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    paid_early: {
      icon: CheckCircle2,
      bg: 'bg-blue-500',
      text: 'Antecipada',
      color: 'text-blue-600 dark:text-blue-400',
    },
    pending: {
      icon: Clock,
      bg: 'bg-muted',
      text: 'Pendente',
      color: 'text-muted-foreground',
    },
    overdue: {
      icon: Clock,
      bg: 'bg-destructive',
      text: 'Vencida',
      color: 'text-destructive',
    },
  };

  const config = statusConfig[item.status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex gap-4"
    >
      {/* Timeline Line & Dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
            config.bg,
            isPaid && 'text-white',
            !isPaid && !isOverdue && 'text-muted-foreground',
            isOverdue && 'text-white'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-0.5 flex-1 min-h-[40px]',
              isPaid ? 'bg-emerald-500/30' : 'bg-border'
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">
              Parcela {item.installmentNumber}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatMonthDisplay(item.monthYear)} · Dia {item.dueDay}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold tabular-nums">
              {formatCurrency(item.amount)}
            </p>
            <Badge
              variant="outline"
              className={cn('text-xs', config.color)}
            >
              {config.text}
            </Badge>
          </div>
        </div>
        {item.paidAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Pago em {new Date(item.paidAt).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// Year Filter
// =============================================================================

interface YearFilterProps {
  years: number[];
  selected: number | null;
  onSelect: (year: number | null) => void;
}

function YearFilter({ years, selected, onSelect }: YearFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-full shrink-0 transition-colors',
          selected === null
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:text-foreground'
        )}
      >
        Todos
      </button>
      {years.map((year) => (
        <button
          key={year}
          onClick={() => onSelect(year)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-full shrink-0 transition-colors',
            selected === year
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          {year}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * DebtPaymentHistory - Drawer component showing payment timeline
 *
 * Features:
 * - Visual timeline with payment status
 * - Filter by year
 * - Shows paid, pending, and overdue installments
 * - Animated entrance
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtPaymentHistory({ debt, children }: DebtPaymentHistoryProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Generate payment history from debt data
  const paymentHistory = useMemo(() => {
    if (!debt.startMonthYear || !debt.totalInstallments || !debt.installmentAmount) {
      return [];
    }

    const [startYear, startMonth] = debt.startMonthYear.split('-').map(Number);
    const history: PaymentHistoryItem[] = [];

    for (let i = 0; i < debt.totalInstallments; i++) {
      const date = new Date(startYear, startMonth - 1 + i, 1);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const installmentNumber = i + 1;

      let status: PaymentHistoryItem['status'] = 'pending';
      if (installmentNumber < debt.currentInstallment) {
        status = 'paid';
      } else if (installmentNumber === debt.currentInstallment) {
        const today = new Date();
        const dueDate = new Date(date.getFullYear(), date.getMonth(), debt.dueDay || 10);
        if (today > dueDate) {
          status = 'overdue';
        }
      }

      history.push({
        installmentNumber,
        monthYear,
        amount: debt.installmentAmount,
        status,
        dueDay: debt.dueDay || 10,
      });
    }

    return history;
  }, [debt]);

  // Get unique years
  const years = useMemo(() => {
    const yearSet = new Set(paymentHistory.map((p) => parseInt(p.monthYear.split('-')[0])));
    return Array.from(yearSet).sort();
  }, [paymentHistory]);

  // Filter by selected year
  const filteredHistory = useMemo(() => {
    if (!selectedYear) return paymentHistory;
    return paymentHistory.filter((p) => p.monthYear.startsWith(String(selectedYear)));
  }, [paymentHistory, selectedYear]);

  // Stats
  const stats = useMemo(() => {
    const paid = paymentHistory.filter((p) => p.status === 'paid' || p.status === 'paid_early');
    const pending = paymentHistory.filter((p) => p.status === 'pending');
    const overdue = paymentHistory.filter((p) => p.status === 'overdue');

    return {
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, p) => sum + p.amount, 0),
      pendingCount: pending.length,
      overdueCount: overdue.length,
    };
  }, [paymentHistory]);

  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Pagamentos
          </DrawerTitle>
          <p className="text-sm text-muted-foreground">
            {debt.name}
            {debt.creditor && ` · ${debt.creditor}`}
          </p>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-muted/50">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {stats.paidCount}
              </p>
              <p className="text-xs text-muted-foreground">Pagas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">
                {stats.pendingCount}
              </p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <div className="text-center">
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                stats.overdueCount > 0 && 'text-destructive'
              )}>
                {stats.overdueCount}
              </p>
              <p className="text-xs text-muted-foreground">Vencidas</p>
            </div>
          </div>

          {/* Year Filter */}
          {years.length > 1 && (
            <YearFilter
              years={years}
              selected={selectedYear}
              onSelect={setSelectedYear}
            />
          )}

          {/* Timeline */}
          <div className="pt-2">
            {filteredHistory.map((item, index) => (
              <TimelineItem
                key={item.installmentNumber}
                item={item}
                isLast={index === filteredHistory.length - 1}
                index={index}
              />
            ))}
          </div>

          {filteredHistory.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pagamento encontrado para este período.
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
