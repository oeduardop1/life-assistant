'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AriaAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  isThinking?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

/**
 * AriaAvatar - Custom gradient avatar for the AI assistant
 *
 * Features a violet gradient that pulses softly when thinking.
 * The "A" represents Aria's identity.
 */
export function AriaAvatar({
  size = 'md',
  isThinking = false,
  className,
}: AriaAvatarProps) {
  return (
    <motion.div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full',
        'bg-gradient-to-br from-chat-accent to-cyan-600',
        sizeClasses[size],
        className
      )}
      animate={
        isThinking
          ? {
              scale: [1, 1.05, 1],
            }
          : {}
      }
      transition={
        isThinking
          ? {
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }
          : {}
      }
    >
      {/* Inner glow effect */}
      <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-white/20 to-transparent" />

      {/* Letter A for Aria */}
      <span className="relative font-semibold text-white">A</span>
    </motion.div>
  );
}
