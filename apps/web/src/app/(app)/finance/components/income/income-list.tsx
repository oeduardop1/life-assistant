'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Income } from '../../types';
import { IncomeCard } from './income-card';

// =============================================================================
// Props
// =============================================================================

interface IncomeListProps {
  incomes: Income[];
  loading?: boolean;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function IncomeListSkeleton() {
  return (
    <div className="space-y-3" data-testid="income-list-loading">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-right space-y-1">
                  <Skeleton className="h-3 w-12 ml-auto" />
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
 * IncomeList - Displays a list of income items
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function IncomeList({ incomes, loading, onEdit, onDelete }: IncomeListProps) {
  if (loading) {
    return <IncomeListSkeleton />;
  }

  if (incomes.length === 0) {
    return null; // Empty state is handled by parent
  }

  return (
    <div className="space-y-3" data-testid="income-list">
      {incomes.map((income) => (
        <IncomeCard
          key={income.id}
          income={income}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
