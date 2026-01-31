'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface FloatingOrbsProps {
  className?: string;
}

/**
 * FloatingOrbs - Decorative animated background orbs for auth pages
 *
 * Three soft, blurred orbs that float gently to create an organic,
 * calming atmosphere. Respects reduced motion preferences.
 */
export function FloatingOrbs({ className }: FloatingOrbsProps) {
  const prefersReducedMotion = useReducedMotion();

  const orbAnimation = prefersReducedMotion
    ? {}
    : {
        y: [0, -20, 0],
        x: [0, 10, 0],
        scale: [1, 1.05, 1],
      };

  const orbTransition = (delay: number, duration: number) => ({
    duration,
    repeat: Infinity,
    ease: 'easeInOut' as const,
    delay,
  });

  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden ${className ?? ''}`}
      aria-hidden="true"
    >
      {/* Orb 1 - Top left, largest, slowest */}
      <motion.div
        className="absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-auth-orb-1 blur-[80px]"
        animate={orbAnimation}
        transition={orbTransition(0, 10)}
      />

      {/* Orb 2 - Bottom right, medium */}
      <motion.div
        className="absolute -bottom-10 -right-10 h-[250px] w-[250px] rounded-full bg-auth-orb-2 blur-[70px]"
        animate={{
          ...orbAnimation,
          y: prefersReducedMotion ? 0 : [0, 15, 0],
          x: prefersReducedMotion ? 0 : [0, -15, 0],
        }}
        transition={orbTransition(2, 8)}
      />

      {/* Orb 3 - Center bottom, smallest, fastest */}
      <motion.div
        className="absolute bottom-1/4 left-1/2 h-[180px] w-[180px] -translate-x-1/2 rounded-full bg-auth-orb-3 blur-[60px]"
        animate={{
          ...orbAnimation,
          y: prefersReducedMotion ? 0 : [0, -25, 0],
        }}
        transition={orbTransition(1, 7)}
      />
    </div>
  );
}
