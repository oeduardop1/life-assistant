'use client';

import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Animation Variants
// =============================================================================

export const messageSlideIn: Variants = {
  hidden: (isUser: boolean) => ({
    opacity: 0,
    x: isUser ? 20 : -20,
    y: 10,
  }),
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

export const conversationItem: Variants = {
  hidden: { opacity: 0, x: -10 },
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

export const suggestionChip: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      delay: i * 0.1,
    },
  }),
  hover: {
    scale: 1.03,
    transition: { duration: 0.2 },
  },
  tap: {
    scale: 0.97,
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

// =============================================================================
// Animated Components
// =============================================================================

interface AnimatedMessageProps {
  children: ReactNode;
  className?: string;
  isUser?: boolean;
  messageKey: string;
}

/**
 * AnimatedMessage - Wrapper for message bubbles with slide-in animation
 */
export function AnimatedMessage({
  children,
  className,
  isUser = false,
  messageKey,
}: AnimatedMessageProps) {
  return (
    <motion.div
      key={messageKey}
      custom={isUser}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={messageSlideIn}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ThinkingDotsProps {
  className?: string;
}

/**
 * ThinkingDots - Three animated dots for thinking indicator
 */
export function ThinkingDots({ className }: ThinkingDotsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-chat-accent"
          animate={{
            y: [0, -4, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

interface SuggestionChipProps {
  children: ReactNode;
  onClick: () => void;
  index: number;
  className?: string;
}

/**
 * SuggestionChip - Animated button for conversation starters
 */
export function SuggestionChip({
  children,
  onClick,
  index,
  className,
}: SuggestionChipProps) {
  return (
    <motion.button
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      variants={suggestionChip}
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-full text-sm',
        'bg-chat-accent-soft text-foreground',
        'border border-chat-input-border',
        'hover:border-chat-accent hover:bg-chat-accent/10',
        'transition-colors cursor-pointer',
        className
      )}
    >
      {children}
    </motion.button>
  );
}

interface AnimatedConversationListProps {
  children: ReactNode;
  className?: string;
}

/**
 * AnimatedConversationList - Container for staggered list animations
 */
export function AnimatedConversationList({
  children,
  className,
}: AnimatedConversationListProps) {
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

// Re-export AnimatePresence for convenience
export { AnimatePresence };
