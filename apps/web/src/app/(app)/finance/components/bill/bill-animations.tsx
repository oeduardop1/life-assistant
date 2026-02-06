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

/**
 * StaggerItem - Individual item in a staggered list
 * Uses its own initial/animate to work with AnimatePresence for dynamic items
 */
export function StaggerItem({ children, className }: StaggerListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
      }}
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
// Bill Card Skeleton
// =============================================================================

interface BillCardSkeletonProps {
  className?: string;
}

/**
 * BillCardSkeleton - Loading skeleton for bill cards
 */
export function BillCardSkeleton({ className }: BillCardSkeletonProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border bg-card/50 space-y-3',
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

      {/* Footer */}
      <div className="flex justify-between items-center pt-1">
        <ShimmerSkeleton className="h-5 w-24" />
        <ShimmerSkeleton className="h-9 w-20" />
      </div>
    </div>
  );
}

// =============================================================================
// Bill Summary Skeleton
// =============================================================================

/**
 * BillSummarySkeleton - Loading skeleton for bill summary
 */
export function BillSummarySkeleton() {
  return (
    <div className="p-4 sm:p-5 rounded-xl border bg-card/50 space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <ShimmerSkeleton className="h-3 w-full" />
        <div className="flex justify-between">
          <ShimmerSkeleton className="h-4 w-20" />
          <ShimmerSkeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-2 pt-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <ShimmerSkeleton className="h-3 w-3" variant="circular" />
            <ShimmerSkeleton className="h-3 w-20" />
            <ShimmerSkeleton className="h-2 flex-1" />
            <ShimmerSkeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Card Hover Effect
// =============================================================================

interface HoverCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * HoverCard - Card with subtle hover scale effect
 */
export function HoverCard({ children, className }: HoverCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// =============================================================================
// Celebration Confetti
// =============================================================================

const CONFETTI_POSITIONS = [
  { x: 15, y: 25 }, { x: 85, y: 35 }, { x: 45, y: 15 },
  { x: 70, y: 80 }, { x: 25, y: 65 }, { x: 55, y: 45 },
  { x: 10, y: 90 }, { x: 90, y: 10 }, { x: 35, y: 75 },
  { x: 60, y: 30 }, { x: 20, y: 50 }, { x: 80, y: 60 },
];

export function CelebrationConfetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {CONFETTI_POSITIONS.map((pos, i) => (
        <motion.div
          key={i}
          className={cn(
            'absolute w-2 h-2 rounded-full',
            i % 3 === 0 && 'bg-emerald-400',
            i % 3 === 1 && 'bg-blue-400',
            i % 3 === 2 && 'bg-amber-400'
          )}
          initial={{
            x: '50%',
            y: '50%',
            scale: 0,
            opacity: 1,
          }}
          animate={{
            x: `${pos.x}%`,
            y: `${pos.y}%`,
            scale: [0, 1, 0.5],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2,
            delay: i * 0.1,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />
      ))}
    </div>
  );
}
