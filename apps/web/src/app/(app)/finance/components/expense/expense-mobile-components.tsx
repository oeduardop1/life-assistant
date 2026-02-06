'use client';

import { useState, useEffect } from 'react';
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
 * FAB - Floating Action Button (always visible on mobile)
 */
export function FAB({ onClick, icon: Icon = Plus, label, className }: FABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-40 sm:hidden',
        'flex items-center gap-2 px-5 py-4',
        'bg-foreground text-background',
        'rounded-full shadow-lg shadow-foreground/20',
        'active:scale-95 transition-transform',
        className
      )}
    >
      <Icon className="h-5 w-5" />
      {label && (
        <span className="text-sm font-medium pr-1">{label}</span>
      )}
    </button>
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
 * Uses native scroll event with passive listener for better performance
 */
export function ScrollToTop({ threshold = 400, className }: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    let lastVisible = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldBeVisible = window.scrollY > threshold;
          // Only update state if visibility changed
          if (shouldBeVisible !== lastVisible) {
            lastVisible = shouldBeVisible;
            setVisible(shouldBeVisible);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        'fixed bottom-6 left-6 z-40',
        'flex items-center justify-center w-10 h-10',
        'bg-muted hover:bg-muted/80',
        'rounded-full shadow-md',
        'active:scale-90 transition-all',
        className
      )}
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}
