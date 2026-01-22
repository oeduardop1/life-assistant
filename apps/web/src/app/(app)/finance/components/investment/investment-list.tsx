'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { InvestmentCard } from './investment-card';
import type { Investment } from '../../types';

interface InvestmentListProps {
  investments: Investment[];
  loading?: boolean;
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
  onUpdateValue: (investment: Investment) => void;
}

/**
 * Skeleton loader for investment card
 */
function InvestmentSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-2 w-full mt-2" />
            <div className="flex gap-4 mt-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16 mt-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * List component for investments with loading state
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function InvestmentList({
  investments,
  loading,
  onEdit,
  onDelete,
  onUpdateValue,
}: InvestmentListProps) {
  if (loading) {
    return (
      <div className="space-y-3" data-testid="investment-list-loading">
        <InvestmentSkeleton />
        <InvestmentSkeleton />
        <InvestmentSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="investment-list">
      {investments.map((investment) => (
        <InvestmentCard
          key={investment.id}
          investment={investment}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdateValue={onUpdateValue}
        />
      ))}
    </div>
  );
}
