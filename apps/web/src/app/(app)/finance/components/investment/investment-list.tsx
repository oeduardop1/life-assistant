'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { InvestmentCard } from './investment-card';
import {
  InvestmentCardSkeleton,
  staggerContainer,
  staggerItem,
} from './investment-animations';
import type { Investment } from '../../types';

interface InvestmentListProps {
  investments: Investment[];
  loading?: boolean;
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
  onUpdateValue: (investment: Investment) => void;
}

/**
 * Loading skeleton for investment list
 */
function InvestmentListSkeleton() {
  return (
    <div className="space-y-3" data-testid="investment-list-loading">
      <InvestmentCardSkeleton />
      <InvestmentCardSkeleton />
      <InvestmentCardSkeleton />
    </div>
  );
}

/**
 * List component for investments with animated enter/exit transitions
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
    return <InvestmentListSkeleton />;
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-3"
      data-testid="investment-list"
    >
      <AnimatePresence mode="popLayout">
        {investments.map((investment) => (
          <motion.div
            key={investment.id}
            layout
            variants={staggerItem}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
          >
            <InvestmentCard
              investment={investment}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdateValue={onUpdateValue}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
