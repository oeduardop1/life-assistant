'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Debt } from '../../types';
import { DebtCard } from './debt-card';

// =============================================================================
// Props
// =============================================================================

interface DebtListProps {
  debts: Debt[];
  loading?: boolean;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onPayInstallment?: (debt: Debt) => void;
  onNegotiate?: (debt: Debt) => void;
  payingDebtId?: string;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function DebtListSkeleton() {
  return (
    <div className="space-y-3" data-testid="debt-list-loading">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-2 w-full mt-3" />
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
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
 * DebtList - Displays a list of debt items
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtList({
  debts,
  loading,
  onEdit,
  onDelete,
  onPayInstallment,
  onNegotiate,
  payingDebtId,
}: DebtListProps) {
  if (loading) {
    return <DebtListSkeleton />;
  }

  if (debts.length === 0) {
    return null; // Empty state is handled by parent
  }

  return (
    <div className="space-y-3" data-testid="debt-list">
      {debts.map((debt) => (
        <DebtCard
          key={debt.id}
          debt={debt}
          onEdit={onEdit}
          onDelete={onDelete}
          onPayInstallment={onPayInstallment}
          onNegotiate={onNegotiate}
          isPayingInstallment={payingDebtId === debt.id}
        />
      ))}
    </div>
  );
}
