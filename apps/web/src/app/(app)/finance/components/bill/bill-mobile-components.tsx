'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

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
