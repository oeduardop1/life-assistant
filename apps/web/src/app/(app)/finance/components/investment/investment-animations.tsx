'use client';

import { motion, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../../types';

// =============================================================================
// Animation Variants
// =============================================================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.15 },
  },
};

// =============================================================================
// Animated Number Counter
// =============================================================================

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
  duration?: number;
}

/**
 * AnimatedNumber - Smoothly animates between number values
 * Uses framer-motion key-based animation for smooth transitions
 */
export function AnimatedNumber({
  value,
  format = formatCurrency,
  className,
  duration = 0.4,
}: AnimatedNumberProps) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.5, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: 'easeOut' }}
      className={className}
    >
      {format(value)}
    </motion.span>
  );
}

// =============================================================================
// Shimmer Skeleton
// =============================================================================

interface ShimmerSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

/**
 * ShimmerSkeleton - Loading skeleton with shimmer animation
 */
export function ShimmerSkeleton({
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
        'relative overflow-hidden bg-muted animate-pulse',
        variantClasses[variant],
        className
      )}
      style={{ width, height }}
    />
  );
}

// =============================================================================
// Summary Skeleton
// =============================================================================

/**
 * InvestmentSummarySkeleton - Loading skeleton for investment summary
 */
export function InvestmentSummarySkeleton() {
  return (
    <div className="space-y-4" data-testid="investment-summary-loading">
      {/* Hero Card */}
      <div className="p-6 rounded-xl border bg-card">
        <ShimmerSkeleton className="h-4 w-32 mb-2" />
        <ShimmerSkeleton className="h-10 w-48" />
        <ShimmerSkeleton className="h-3 w-24 mt-2" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl border bg-card">
            <ShimmerSkeleton className="h-3 w-20 mb-2" />
            <ShimmerSkeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Card Skeleton
// =============================================================================

/**
 * InvestmentCardSkeleton - Loading skeleton for investment card
 */
export function InvestmentCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border bg-card space-y-3">
      <div className="flex items-start gap-3">
        <ShimmerSkeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton className="h-4 w-1/3" />
          <ShimmerSkeleton className="h-3 w-1/4" />
        </div>
        <div className="text-right space-y-1">
          <ShimmerSkeleton className="h-5 w-24" />
          <ShimmerSkeleton className="h-3 w-16" />
        </div>
      </div>
      <ShimmerSkeleton className="h-2 w-full" />
      <div className="flex gap-4">
        <ShimmerSkeleton className="h-3 w-20" />
        <ShimmerSkeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

// =============================================================================
// Stagger List Components
// =============================================================================

interface StaggerListProps {
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}

/**
 * StaggerList - Container for staggered list animations
 */
export function StaggerList({ children, className, 'data-testid': testId }: StaggerListProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
      data-testid={testId}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerItem - Individual item in a staggered list
 */
export function StaggerItem({ children, className }: StaggerListProps) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// =============================================================================
// Empty State Animation
// =============================================================================

interface AnimatedEmptyStateProps {
  children: ReactNode;
  className?: string;
}

/**
 * AnimatedEmptyState - Entrance animation for empty states
 */
export function AnimatedEmptyState({
  children,
  className,
}: AnimatedEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedIcon - Subtle spring animation for icons
 */
export function AnimatedIcon({ children, className }: AnimatedEmptyStateProps) {
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
