'use client';

import { motion, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Animation Variants (internal only)
// =============================================================================

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// =============================================================================
// Animated Container Components
// =============================================================================

/**
 * StaggerList - Container for staggered list animations
 */
interface StaggerListProps {
  children: ReactNode;
  className?: string;
}

export function StaggerList({ children, className }: StaggerListProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// =============================================================================
// Skeleton with Shimmer (internal helper)
// =============================================================================

interface ShimmerSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

function ShimmerSkeleton({
  className,
  variant = 'rectangular',
  width,
  height,
}: ShimmerSkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        variantClasses[variant],
        className
      )}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
        animate={{ translateX: ['−100%', '100%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

// =============================================================================
// Card Skeleton
// =============================================================================

interface DebtCardSkeletonProps {
  className?: string;
}

/**
 * DebtCardSkeleton - Loading skeleton for debt cards
 */
export function DebtCardSkeleton({ className }: DebtCardSkeletonProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border bg-card/50 space-y-4',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <ShimmerSkeleton className="h-10 w-10" variant="circular" />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton className="h-4 w-3/4" />
          <ShimmerSkeleton className="h-3 w-1/2" />
        </div>
        <ShimmerSkeleton className="h-6 w-20" />
      </div>

      {/* Progress */}
      <ShimmerSkeleton className="h-2 w-full" />

      {/* Footer */}
      <div className="flex justify-between items-center pt-2">
        <ShimmerSkeleton className="h-8 w-24" />
        <ShimmerSkeleton className="h-9 w-28" />
      </div>
    </div>
  );
}
