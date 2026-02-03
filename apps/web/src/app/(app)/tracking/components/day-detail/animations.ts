import type { Variants, Transition } from 'framer-motion';

/**
 * Shared animation variants for the Day Detail modal
 * Following the project's spring physics pattern (stiffness: 300, damping: 24)
 *
 * @see apps/web/src/app/(app)/finance/components/bill/bill-animations.tsx for reference
 */

// =============================================================================
// Spring Configuration
// =============================================================================

export const springConfig = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 24,
};

export const softSpringConfig = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 28,
};

// =============================================================================
// Journal Entrance Animation
// =============================================================================

export const journalEntrance: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: { duration: 0.15 },
  },
};

// =============================================================================
// Date Header Animation
// =============================================================================

export const dateHeaderEntrance: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      ...springConfig,
      delay: 0.1,
    },
  },
};

// =============================================================================
// Checkmark Path Animation (SVG pathLength)
// =============================================================================

export const checkmarkPath: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: 0.25,
        ease: 'easeOut',
      },
      opacity: {
        duration: 0.1,
      },
    },
  },
};

// =============================================================================
// Progress Dot Animation (for staggered entrance)
// =============================================================================

export const dotEntrance = (delay: number): Variants => ({
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
      delay,
    },
  },
});

// =============================================================================
// Fire Glow Animation (for streak badge)
// =============================================================================

export const fireGlow: Variants = {
  idle: {
    boxShadow: '0 0 0 0 oklch(0.70 0.20 40 / 0)',
  },
  active: {
    boxShadow: [
      '0 0 0 0 oklch(0.70 0.20 40 / 0)',
      '0 0 12px 4px var(--journal-fire-glow)',
      '0 0 0 0 oklch(0.70 0.20 40 / 0)',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// =============================================================================
// Stagger Container (for lists)
// =============================================================================

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
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springConfig,
  },
};

// =============================================================================
// Metric Bar Segment Animation
// =============================================================================

export const segmentFill = (delay: number): Variants => ({
  hidden: {
    scaleY: 0,
    opacity: 0,
  },
  visible: {
    scaleY: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 22,
      delay,
    },
  },
});

// =============================================================================
// Hover Effects
// =============================================================================

export const hoverLift = {
  whileHover: {
    y: -2,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
  whileTap: {
    scale: 0.98,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
};

export const checkboxBounce = {
  whileTap: {
    scale: 0.9,
    transition: { type: 'spring' as const, stiffness: 500, damping: 20 },
  },
};

// =============================================================================
// Reduced Motion Helpers
// =============================================================================

/**
 * Empty variants for users who prefer reduced motion.
 * Components use this as: variants={prefersReducedMotion ? noAnimation : actualVariants}
 */
export const noAnimation: Variants = {
  hidden: {},
  visible: {},
  exit: {},
};

/**
 * Transition for value changes (numbers, progress)
 */
export const valueChangeTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};
