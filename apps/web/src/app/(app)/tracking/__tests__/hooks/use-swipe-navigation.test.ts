import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeNavigation } from '../../hooks/use-swipe-navigation';
import type { PanInfo } from 'framer-motion';

describe('useSwipeNavigation', () => {
  const createPanInfo = (offsetX: number, velocityX: number): PanInfo => ({
    point: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
    offset: { x: offsetX, y: 0 },
    velocity: { x: velocityX, y: 0 },
  });

  describe('swipe detection', () => {
    it('should_call_onSwipeLeft_when_swiping_left_past_threshold', () => {
      const onSwipeLeft = vi.fn();
      const onSwipeRight = vi.fn();

      const { result } = renderHook(() =>
        useSwipeNavigation({
          onSwipeLeft,
          onSwipeRight,
          threshold: 50,
        })
      );

      act(() => {
        result.current.handlePanStart();
        result.current.handlePanEnd(
          new MouseEvent('mouseup') as unknown as MouseEvent,
          createPanInfo(-100, 0)
        );
      });

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it('should_call_onSwipeRight_when_swiping_right_past_threshold', () => {
      const onSwipeLeft = vi.fn();
      const onSwipeRight = vi.fn();

      const { result } = renderHook(() =>
        useSwipeNavigation({
          onSwipeLeft,
          onSwipeRight,
          threshold: 50,
        })
      );

      act(() => {
        result.current.handlePanStart();
        result.current.handlePanEnd(
          new MouseEvent('mouseup') as unknown as MouseEvent,
          createPanInfo(100, 0)
        );
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
      expect(onSwipeLeft).not.toHaveBeenCalled();
    });

    it('should_not_trigger_callback_if_below_threshold', () => {
      const onSwipeLeft = vi.fn();
      const onSwipeRight = vi.fn();

      const { result } = renderHook(() =>
        useSwipeNavigation({
          onSwipeLeft,
          onSwipeRight,
          threshold: 50,
          velocityThreshold: 500,
        })
      );

      act(() => {
        result.current.handlePanStart();
        result.current.handlePanEnd(
          new MouseEvent('mouseup') as unknown as MouseEvent,
          createPanInfo(30, 100) // Below both thresholds
        );
      });

      expect(onSwipeLeft).not.toHaveBeenCalled();
      expect(onSwipeRight).not.toHaveBeenCalled();
    });
  });

  describe('velocity-based detection', () => {
    it('should_trigger_swipe_based_on_high_velocity', () => {
      const onSwipeLeft = vi.fn();
      const onSwipeRight = vi.fn();

      const { result } = renderHook(() =>
        useSwipeNavigation({
          onSwipeLeft,
          onSwipeRight,
          threshold: 50,
          velocityThreshold: 500,
        })
      );

      act(() => {
        result.current.handlePanStart();
        result.current.handlePanEnd(
          new MouseEvent('mouseup') as unknown as MouseEvent,
          createPanInfo(-30, -600) // Below distance threshold but high velocity
        );
      });

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });
  });

  describe('state management', () => {
    it('should_set_isPanning_true_on_start', () => {
      const { result } = renderHook(() =>
        useSwipeNavigation({
          onSwipeLeft: vi.fn(),
          onSwipeRight: vi.fn(),
        })
      );

      expect(result.current.isPanning).toBe(false);

      act(() => {
        result.current.handlePanStart();
      });

      expect(result.current.isPanning).toBe(true);
    });

    it('should_set_isPanning_false_on_end', () => {
      const { result } = renderHook(() =>
        useSwipeNavigation({
          onSwipeLeft: vi.fn(),
          onSwipeRight: vi.fn(),
        })
      );

      act(() => {
        result.current.handlePanStart();
      });

      expect(result.current.isPanning).toBe(true);

      act(() => {
        result.current.handlePanEnd(
          new MouseEvent('mouseup') as unknown as MouseEvent,
          createPanInfo(-100, 0)
        );
      });

      expect(result.current.isPanning).toBe(false);
    });

    it('should_set_correct_direction_on_swipe', () => {
      const { result } = renderHook(() =>
        useSwipeNavigation({
          onSwipeLeft: vi.fn(),
          onSwipeRight: vi.fn(),
        })
      );

      // Swipe left
      act(() => {
        result.current.handlePanStart();
        result.current.handlePanEnd(
          new MouseEvent('mouseup') as unknown as MouseEvent,
          createPanInfo(-100, 0)
        );
      });

      expect(result.current.direction).toBe(1); // Left = positive direction (next)

      // Swipe right
      act(() => {
        result.current.handlePanStart();
        result.current.handlePanEnd(
          new MouseEvent('mouseup') as unknown as MouseEvent,
          createPanInfo(100, 0)
        );
      });

      expect(result.current.direction).toBe(-1); // Right = negative direction (prev)
    });
  });

  describe('default values', () => {
    it('should_use_default_threshold_of_50', () => {
      const onSwipeLeft = vi.fn();

      const { result } = renderHook(() =>
        useSwipeNavigation({
          onSwipeLeft,
          onSwipeRight: vi.fn(),
          // Not passing threshold, should use default 50
        })
      );

      // 49px should not trigger
      act(() => {
        result.current.handlePanStart();
        result.current.handlePanEnd(
          new MouseEvent('mouseup') as unknown as MouseEvent,
          createPanInfo(-49, 0)
        );
      });

      expect(onSwipeLeft).not.toHaveBeenCalled();

      // 51px should trigger
      act(() => {
        result.current.handlePanStart();
        result.current.handlePanEnd(
          new MouseEvent('mouseup') as unknown as MouseEvent,
          createPanInfo(-51, 0)
        );
      });

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });
  });
});
