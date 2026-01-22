'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Bill } from '../../types';
import { BillCard } from './bill-card';

// =============================================================================
// Props
// =============================================================================

interface BillListProps {
  bills: Bill[];
  loading?: boolean;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
  onTogglePaid: (bill: Bill) => void;
  togglingBillId?: string;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function BillListSkeleton() {
  return (
    <div className="space-y-3" data-testid="bill-list-loading">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Skeleton className="h-5 w-5 rounded mt-1" />
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                  <Skeleton className="h-3 w-28" />
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
 * BillList - Displays a list of bill items
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
}: BillListProps) {
  if (loading) {
    return <BillListSkeleton />;
  }

  if (bills.length === 0) {
    return null; // Empty state is handled by parent
  }

  return (
    <div className="space-y-3" data-testid="bill-list">
      {bills.map((bill) => (
        <BillCard
          key={bill.id}
          bill={bill}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePaid={onTogglePaid}
          isTogglingPaid={togglingBillId === bill.id}
        />
      ))}
    </div>
  );
}
