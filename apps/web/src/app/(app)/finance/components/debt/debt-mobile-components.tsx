'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Plus, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Floating Action Button
// =============================================================================

interface FABProps {
  onClick: () => void;
  icon?: typeof Plus;
  label?: string;
  className?: string;
}

/**
 * FAB - Floating Action Button that hides on scroll down
 *
 * Features:
 * - Auto-hide on scroll down
 * - Show on scroll up
 * - Smooth spring animation
 * - Optional label expansion
 */
export function FAB({ onClick, icon: Icon = Plus, label, className }: FABProps) {
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const direction = latest > lastScrollY ? 'down' : 'up';

    if (direction === 'down' && latest > 100) {
      setVisible(false);
    } else {
      setVisible(true);
    }

    setLastScrollY(latest);
  });

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClick}
          className={cn(
            'fixed bottom-6 right-6 z-40',
            'flex items-center gap-2 px-5 py-4',
            'bg-foreground text-background',
            'rounded-full shadow-lg shadow-foreground/20',
            'transition-colors',
            className
          )}
        >
          <Icon className="h-5 w-5" />
          {label && (
            <span className="text-sm font-medium pr-1">{label}</span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Scroll to Top Button
// =============================================================================

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
}

/**
 * ScrollToTop - Button that appears after scrolling down
 */
export function ScrollToTop({ threshold = 400, className }: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setVisible(latest > threshold);
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className={cn(
            'fixed bottom-6 left-6 z-40',
            'flex items-center justify-center w-10 h-10',
            'bg-muted hover:bg-muted/80',
            'rounded-full shadow-md',
            'transition-colors',
            className
          )}
        >
          <ChevronUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
