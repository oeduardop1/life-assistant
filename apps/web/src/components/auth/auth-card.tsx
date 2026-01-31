'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AuthCard - Enhanced card for auth forms
 *
 * Features backdrop blur, enhanced shadows, and entrance animation.
 * Provides a glass-morphism effect that works in both light and dark modes.
 */
export function AuthCard({ children, className }: AuthCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(
        'w-full max-w-md rounded-2xl p-8',
        'bg-card/80 backdrop-blur-md',
        'border border-border/50',
        'shadow-xl shadow-black/5 dark:shadow-black/20',
        className
      )}
      initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        delay: 0.3,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
}
