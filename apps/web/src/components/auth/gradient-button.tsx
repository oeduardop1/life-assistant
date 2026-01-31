'use client';

import * as React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GradientButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  isLoading?: boolean;
  loadingText?: string;
}

/**
 * GradientButton - Primary CTA button with gradient background
 *
 * Features a cyan gradient matching Aria's identity, with hover/active
 * animations and a loading state with spinner.
 */
export const GradientButton = React.forwardRef<
  HTMLButtonElement,
  GradientButtonProps
>(({ children, className, isLoading, loadingText, disabled, ...props }, ref) => {
  const prefersReducedMotion = useReducedMotion();
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      ref={ref}
      className={cn(
        'relative flex h-11 w-full items-center justify-center rounded-lg px-6 text-base font-semibold',
        'bg-gradient-to-r from-chat-accent to-cyan-600',
        'text-white shadow-lg shadow-chat-accent/25',
        'transition-shadow duration-200',
        'hover:shadow-xl hover:shadow-chat-accent/30',
        'focus:outline-none focus:ring-2 focus:ring-chat-accent/50 focus:ring-offset-2 focus:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      disabled={isDisabled}
      whileHover={prefersReducedMotion || isDisabled ? {} : { scale: 1.02 }}
      whileTap={prefersReducedMotion || isDisabled ? {} : { scale: 0.98 }}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </motion.button>
  );
});

GradientButton.displayName = 'GradientButton';
