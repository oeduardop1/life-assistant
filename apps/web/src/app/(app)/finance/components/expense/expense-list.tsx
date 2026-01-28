'use client';

import { formatCurrency, type Expense } from '../../types';
import { ExpenseCard } from './expense-card';
import { StaggerList, StaggerItem, ExpenseCardSkeleton } from './expense-animations';

// =============================================================================
// Props
// =============================================================================

interface ExpenseListProps {
  expenses: Expense[];
  loading?: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onQuickUpdate?: (expense: Expense) => void;
  showSectionHeader?: boolean;
  sectionTitle?: string;
  sectionIcon?: React.ReactNode;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function ExpenseListSkeleton() {
  return (
    <div className="space-y-3" data-testid="expense-list-loading">
      {Array.from({ length: 3 }).map((_, index) => (
        <ExpenseCardSkeleton key={index} />
      ))}
    </div>
  );
}

// =============================================================================
// Section Header
// =============================================================================

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  count: number;
  total: number;
}

function SectionHeader({ title, icon, count, total }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="rounded-lg bg-muted p-1.5">
            {icon}
          </div>
        )}
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">{title}</h3>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground tabular-nums">
            {count}
          </span>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground tabular-nums">
        {formatCurrency(total)}
      </span>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * ExpenseList - Displays a list of expense items with staggered animation
 *
 * Features:
 * - Optional section header with count and total
 * - Staggered animation on list items
 * - Improved skeleton loading states
 * - Quick update support
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseList({
  expenses,
  loading,
  onEdit,
  onDelete,
  onQuickUpdate,
  showSectionHeader = false,
  sectionTitle,
  sectionIcon,
}: ExpenseListProps) {
  if (loading) {
    return <ExpenseListSkeleton />;
  }

  if (expenses.length === 0) {
    return null; // Empty state is handled by parent
  }

  // Calculate section total
  const sectionTotal = expenses.reduce((sum, expense) => {
    const actual = typeof expense.actualAmount === 'string'
      ? parseFloat(expense.actualAmount)
      : expense.actualAmount;
    return sum + actual;
  }, 0);

  return (
    <div data-testid="expense-list">
      {showSectionHeader && sectionTitle && (
        <SectionHeader
          title={sectionTitle}
          icon={sectionIcon}
          count={expenses.length}
          total={sectionTotal}
        />
      )}

      <StaggerList className="space-y-3">
        {expenses.map((expense) => (
          <StaggerItem key={expense.id}>
            <ExpenseCard
              expense={expense}
              onEdit={onEdit}
              onDelete={onDelete}
              onQuickUpdate={onQuickUpdate}
            />
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  );
}
