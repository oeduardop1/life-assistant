'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTracking } from '../../context/tracking-context';
import { useSwipeNavigation } from '../../hooks/use-swipe-navigation';
import { CalendarMonth } from './calendar-month';

/**
 * Animation variants for slide transitions
 */
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

/**
 * SwipeableCalendar - Calendar wrapper with swipe navigation support
 *
 * Features:
 * - Horizontal swipe detection for month navigation
 * - Animated slide transitions between months
 * - Mobile-friendly touch handling
 * - Allows vertical scroll (touch-pan-y)
 *
 * @see docs/specs/domains/tracking.md §3.2 for calendar navigation
 */
export function SwipeableCalendar() {
  const { currentMonth, goToNextMonth, goToPreviousMonth } = useTracking();
  const [direction, setDirection] = useState(0);

  const handleSwipeLeft = useCallback(() => {
    setDirection(1);
    goToNextMonth();
  }, [goToNextMonth]);

  const handleSwipeRight = useCallback(() => {
    setDirection(-1);
    goToPreviousMonth();
  }, [goToPreviousMonth]);

  const { handlePanStart, handlePanEnd } = useSwipeNavigation({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  return (
    <motion.div
      onPanStart={handlePanStart}
      onPanEnd={handlePanEnd}
      className="touch-pan-y overflow-hidden"
    >
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={currentMonth}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
        >
          <CalendarMonth />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
