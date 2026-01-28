'use client';

import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Animation Variants
// =============================================================================

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.2 },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

// =============================================================================
// Animated Container Components
// =============================================================================

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * FadeInUp - Animates children with a fade in and slide up effect
 */
export function FadeInUp({ children, className, delay = 0 }: AnimatedContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeInUp}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * ScaleIn - Animates children with a scale and fade effect
 */
export function ScaleIn({ children, className, delay = 0 }: AnimatedContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={scaleIn}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

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
 */
export function StaggerItem({ children, className }: StaggerListProps) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// =============================================================================
// Progress Bar Animation
// =============================================================================

interface AnimatedProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'success' | 'warning' | 'danger';
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const colorClasses = {
  default: 'bg-foreground',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-destructive',
};

/**
 * AnimatedProgressBar - Progress bar with smooth animation
 */
export function AnimatedProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  showLabel = false,
  size = 'md',
  color = 'default',
}: AnimatedProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative w-full bg-muted rounded-full overflow-hidden',
          sizeClasses[size]
        )}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1],
            delay: 0.2,
          }}
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            colorClasses[color],
            barClassName
          )}
        />
      </div>
      {showLabel && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-muted-foreground mt-1 block text-right"
        >
          {Math.round(percent)}%
        </motion.span>
      )}
    </div>
  );
}

// =============================================================================
// Number Counter Animation
// =============================================================================

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
  duration?: number;
}

/**
 * AnimatedNumber - Animates number changes with a counting effect
 */
export function AnimatedNumber({
  value,
  format = (v) => v.toString(),
  className,
  duration = 0.5,
}: AnimatedNumberProps) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration }}
      className={className}
    >
      {format(value)}
    </motion.span>
  );
}

// =============================================================================
// Pulse Animation
// =============================================================================

interface PulseProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
}

/**
 * Pulse - Adds a pulsing animation to children when active
 */
export function Pulse({ children, active = false, className }: PulseProps) {
  return (
    <motion.div
      animate={
        active
          ? {
              scale: [1, 1.02, 1],
              transition: {
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }
          : {}
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

// =============================================================================
// Skeleton with Shimmer
// =============================================================================

interface ShimmerSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

/**
 * ShimmerSkeleton - Skeleton loading state with shimmer animation
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

// =============================================================================
// Summary Skeleton
// =============================================================================

/**
 * DebtSummarySkeleton - Loading skeleton for debt summary
 */
export function DebtSummarySkeleton() {
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1">
            <ShimmerSkeleton className="h-3 w-16" />
            <ShimmerSkeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Loading Overlay
// =============================================================================

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

/**
 * LoadingOverlay - Full overlay with loading indicator
 */
export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full"
            />
            {message && (
              <span className="text-sm text-muted-foreground">{message}</span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Success Checkmark Animation
// =============================================================================

interface SuccessCheckmarkProps {
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const checkmarkSizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

/**
 * SuccessCheckmark - Animated checkmark for success states
 */
export function SuccessCheckmark({ show, size = 'md' }: SuccessCheckmarkProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn(
            'rounded-full bg-emerald-500 flex items-center justify-center',
            checkmarkSizes[size]
          )}
        >
          <motion.svg
            viewBox="0 0 24 24"
            className="w-1/2 h-1/2 text-white"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <motion.path
              d="M5 13l4 4L19 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
