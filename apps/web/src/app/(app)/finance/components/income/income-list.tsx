'use client';

import { AnimatePresence } from 'framer-motion';
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
  onRegisterValue?: (income: Income) => void;
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
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
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
 * IncomeList - Displays a list of income items with animations
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function IncomeList({
  incomes,
  loading,
  onEdit,
  onDelete,
  onRegisterValue,
}: IncomeListProps) {
  if (loading) {
    return <IncomeListSkeleton />;
  }

  if (incomes.length === 0) {
    return null; // Empty state is handled by parent
  }

  return (
    <div className="space-y-3" data-testid="income-list">
      <AnimatePresence mode="popLayout">
        {incomes.map((income) => (
          <IncomeCard
            key={income.id}
            income={income}
            onEdit={onEdit}
            onDelete={onDelete}
            onRegisterValue={onRegisterValue}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
