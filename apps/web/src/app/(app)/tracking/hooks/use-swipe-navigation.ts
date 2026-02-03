'use client';

import { useState, useCallback } from 'react';
import type { PanInfo } from 'framer-motion';

interface UseSwipeNavigationOptions {
  /** Callback when user swipes left (next) */
  onSwipeLeft: () => void;
  /** Callback when user swipes right (previous) */
  onSwipeRight: () => void;
  /** Minimum distance to trigger swipe (default: 50px) */
  threshold?: number;
  /** Minimum velocity to trigger swipe (default: 500) */
  velocityThreshold?: number;
}

interface UseSwipeNavigationReturn {
  /** Whether the user is currently panning */
  isPanning: boolean;
  /** Direction of the current/last swipe (-1: right, 0: none, 1: left) */
  direction: number;
  /** Handler for pan start event */
  handlePanStart: () => void;
  /** Handler for pan end event */
  handlePanEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
}

/**
 * Hook for detecting horizontal swipe gestures
 *
 * Uses Framer Motion's onPan handlers to detect swipe direction
 * and trigger callbacks for navigation.
 *
 * @example
 * ```tsx
 * const { handlePanStart, handlePanEnd, direction } = useSwipeNavigation({
 *   onSwipeLeft: () => goToNextMonth(),
 *   onSwipeRight: () => goToPreviousMonth(),
 * });
 *
 * <motion.div onPanStart={handlePanStart} onPanEnd={handlePanEnd}>
 *   {content}
 * </motion.div>
 * ```
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  velocityThreshold = 500,
}: UseSwipeNavigationOptions): UseSwipeNavigationReturn {
  const [isPanning, setIsPanning] = useState(false);
  const [direction, setDirection] = useState(0);

  const handlePanStart = useCallback(() => {
    setIsPanning(true);
  }, []);

  const handlePanEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsPanning(false);

      const { offset, velocity } = info;

      // Check if swipe meets threshold (distance or velocity)
      const isValidSwipe =
        Math.abs(offset.x) > threshold ||
        Math.abs(velocity.x) > velocityThreshold;

      if (!isValidSwipe) {
        setDirection(0);
        return;
      }

      // Determine direction based on offset (primary) or velocity (secondary)
      const swipeDirection = offset.x < 0 || velocity.x < -velocityThreshold ? 1 : -1;
      setDirection(swipeDirection);

      // Trigger appropriate callback
      if (swipeDirection > 0) {
        onSwipeLeft(); // Swiped left = next month
      } else {
        onSwipeRight(); // Swiped right = previous month
      }
    },
    [onSwipeLeft, onSwipeRight, threshold, velocityThreshold]
  );

  return {
    isPanning,
    direction,
    handlePanStart,
    handlePanEnd,
  };
}
