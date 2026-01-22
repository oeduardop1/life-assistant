'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Expense } from '../../types';
import { ExpenseCard } from './expense-card';

// =============================================================================
// Props
// =============================================================================

interface ExpenseListProps {
  expenses: Expense[];
  loading?: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function ExpenseListSkeleton() {
  return (
    <div className="space-y-3" data-testid="expense-list-loading">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-2 w-full mt-2" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * ExpenseList - Displays a list of expense items
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseList({
  expenses,
  loading,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  if (loading) {
    return <ExpenseListSkeleton />;
  }

  if (expenses.length === 0) {
    return null; // Empty state is handled by parent
  }

  return (
    <div className="space-y-3" data-testid="expense-list">
      {expenses.map((expense) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
