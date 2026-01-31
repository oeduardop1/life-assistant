'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AriaAvatarLargeProps {
  className?: string;
}

/**
 * AriaAvatarLarge - Large animated avatar for auth branding
 *
 * Features a cyan gradient with outer glow ring and subtle pulse animation.
 * Used on login/signup pages to establish Aria's identity.
 */
export function AriaAvatarLarge({ className }: AriaAvatarLargeProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={cn('relative', className)}>
      {/* Outer glow ring - slowly rotating */}
      <motion.div
        className="absolute -inset-3 rounded-full bg-gradient-to-r from-chat-accent/40 via-cyan-400/20 to-chat-accent/40 blur-xl"
        animate={
          prefersReducedMotion
            ? {}
            : {
                rotate: [0, 360],
              }
        }
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Main avatar container */}
      <motion.div
        className={cn(
          'relative flex h-28 w-28 items-center justify-center rounded-full',
          'bg-gradient-to-br from-chat-accent via-cyan-500 to-cyan-600',
          'shadow-2xl shadow-chat-accent/30'
        )}
        animate={
          prefersReducedMotion
            ? {}
            : {
                scale: [1, 1.03, 1],
              }
        }
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Inner shine effect */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent" />

        {/* Inner border ring */}
        <div className="absolute inset-0.5 rounded-full border border-white/20" />

        {/* Letter A for Aria */}
        <span className="relative text-4xl font-bold text-white drop-shadow-md">
          A
        </span>
      </motion.div>
    </div>
  );
}
