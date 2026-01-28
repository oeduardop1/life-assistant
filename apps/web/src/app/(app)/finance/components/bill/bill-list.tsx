'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Bill } from '../../types';
import { getDueDateForMonth } from '../../types';
import { BillCard } from './bill-card';
import { BillCardSkeleton, StaggerList, StaggerItem } from './bill-animations';

// =============================================================================
// Types
// =============================================================================

interface BillListProps {
  bills: Bill[];
  loading?: boolean;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
  onTogglePaid: (bill: Bill) => void;
  togglingBillId?: string;
  grouped?: boolean;
}

type BillGroup = 'overdue' | 'pending' | 'paid';

interface GroupedBills {
  overdue: Bill[];
  pending: Bill[];
  paid: Bill[];
}

// =============================================================================
// Helpers
// =============================================================================

function getDaysUntilDue(monthYear: string, dueDay: number): number {
  const dueDate = getDueDateForMonth(monthYear, dueDay);
  const today = new Date();
  const due = new Date(dueDate + 'T00:00:00');

  today.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function groupBills(bills: Bill[]): GroupedBills {
  const groups: GroupedBills = {
    overdue: [],
    pending: [],
    paid: [],
  };

  for (const bill of bills) {
    if (bill.status === 'paid') {
      groups.paid.push(bill);
    } else if (bill.status === 'overdue') {
      groups.overdue.push(bill);
    } else if (bill.status === 'pending') {
      // Check if actually overdue based on date
      const daysUntil = getDaysUntilDue(bill.monthYear, bill.dueDay);
      if (daysUntil < 0) {
        groups.overdue.push(bill);
      } else {
        groups.pending.push(bill);
      }
    } else {
      // canceled or other status - treat as pending for grouping
      groups.pending.push(bill);
    }
  }

  // Sort pending bills by due date (ascending)
  groups.pending.sort((a, b) => {
    const daysA = getDaysUntilDue(a.monthYear, a.dueDay);
    const daysB = getDaysUntilDue(b.monthYear, b.dueDay);
    return daysA - daysB;
  });

  // Sort overdue by how long overdue (most overdue first)
  groups.overdue.sort((a, b) => {
    const daysA = getDaysUntilDue(a.monthYear, a.dueDay);
    const daysB = getDaysUntilDue(b.monthYear, b.dueDay);
    return daysA - daysB;
  });

  // Sort paid by paid date (most recent first)
  groups.paid.sort((a, b) => {
    const dateA = a.paidAt ? new Date(a.paidAt).getTime() : 0;
    const dateB = b.paidAt ? new Date(b.paidAt).getTime() : 0;
    return dateB - dateA;
  });

  return groups;
}

// =============================================================================
// Section Header
// =============================================================================

interface SectionHeaderProps {
  group: BillGroup;
  count: number;
}

const groupConfig = {
  overdue: {
    icon: AlertTriangle,
    label: 'Vencidas',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  pending: {
    icon: Clock,
    label: 'Pendentes',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  paid: {
    icon: CheckCircle2,
    label: 'Pagas',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
};

function SectionHeader({ group, count }: SectionHeaderProps) {
  const config = groupConfig[group];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 mb-3"
    >
      <div className={cn('p-1.5 rounded-lg', config.bgColor)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>
      <h3 className={cn('text-sm font-semibold', config.color)}>
        {config.label}
      </h3>
      <span className="text-xs text-muted-foreground">
        ({count})
      </span>
    </motion.div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function BillListSkeleton() {
  return (
    <div className="space-y-3" data-testid="bill-list-loading">
      {Array.from({ length: 3 }).map((_, index) => (
        <BillCardSkeleton key={index} />
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * BillList - Displays a list of bill items with intelligent grouping
 *
 * Features:
 * - Groups bills by status: Overdue, Pending, Paid
 * - Section headers with counts
 * - Staggered animations
 * - Sort by urgency within groups
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function BillList({
  bills,
  loading,
  onEdit,
  onDelete,
  onTogglePaid,
  togglingBillId,
  grouped = true,
}: BillListProps) {
  const groupedBills = useMemo(() => groupBills(bills), [bills]);

  if (loading) {
    return <BillListSkeleton />;
  }

  if (bills.length === 0) {
    return null; // Empty state is handled by parent
  }

  // If not grouped, show flat list
  if (!grouped) {
    return (
      <StaggerList className="space-y-3" data-testid="bill-list">
        <AnimatePresence mode="popLayout">
          {bills.map((bill) => (
            <StaggerItem key={bill.id}>
              <BillCard
                bill={bill}
                onEdit={onEdit}
                onDelete={onDelete}
                onTogglePaid={onTogglePaid}
                isTogglingPaid={togglingBillId === bill.id}
              />
            </StaggerItem>
          ))}
        </AnimatePresence>
      </StaggerList>
    );
  }

  // Grouped view
  return (
    <div className="space-y-6" data-testid="bill-list">
      {/* Overdue Section */}
      {groupedBills.overdue.length > 0 && (
        <section>
          <SectionHeader group="overdue" count={groupedBills.overdue.length} />
          <StaggerList className="space-y-3">
            <AnimatePresence mode="popLayout">
              {groupedBills.overdue.map((bill) => (
                <StaggerItem key={bill.id}>
                  <BillCard
                    bill={bill}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTogglePaid={onTogglePaid}
                    isTogglingPaid={togglingBillId === bill.id}
                  />
                </StaggerItem>
              ))}
            </AnimatePresence>
          </StaggerList>
        </section>
      )}

      {/* Pending Section */}
      {groupedBills.pending.length > 0 && (
        <section>
          <SectionHeader group="pending" count={groupedBills.pending.length} />
          <StaggerList className="space-y-3">
            <AnimatePresence mode="popLayout">
              {groupedBills.pending.map((bill) => (
                <StaggerItem key={bill.id}>
                  <BillCard
                    bill={bill}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTogglePaid={onTogglePaid}
                    isTogglingPaid={togglingBillId === bill.id}
                  />
                </StaggerItem>
              ))}
            </AnimatePresence>
          </StaggerList>
        </section>
      )}

      {/* Paid Section */}
      {groupedBills.paid.length > 0 && (
        <section>
          <SectionHeader group="paid" count={groupedBills.paid.length} />
          <StaggerList className="space-y-3">
            <AnimatePresence mode="popLayout">
              {groupedBills.paid.map((bill) => (
                <StaggerItem key={bill.id}>
                  <BillCard
                    bill={bill}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTogglePaid={onTogglePaid}
                    isTogglingPaid={togglingBillId === bill.id}
                  />
                </StaggerItem>
              ))}
            </AnimatePresence>
          </StaggerList>
        </section>
      )}
    </div>
  );
}
