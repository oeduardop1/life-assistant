'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { checkmarkPath, checkboxBounce, noAnimation } from './animations';

interface JournalCheckboxProps {
  /** Checkbox ID for accessibility */
  id: string;
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Change handler */
  onCheckedChange: (checked: boolean) => void;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Optional accent color (hex) for the border */
  accentColor?: string | null;
  /** Optional className */
  className?: string;
}

/**
 * JournalCheckbox - Animated checkbox with journal aesthetic
 *
 * Features:
 * - Larger size (24x24px) for better touch targets
 * - Dashed border when unchecked, solid when checked
 * - SVG checkmark with pathLength animation
 * - Scale bounce on tap
 * - Optional accent color for border
 * - Respects reduced motion preference
 *
 * @see docs/specs/domains/tracking.md for habit completion
 */
export function JournalCheckbox({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  accentColor,
  className,
}: JournalCheckboxProps) {
  const prefersReducedMotion = useReducedMotion();

  const handleClick = () => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  // Border style based on accent color
  const borderStyle = accentColor
    ? { borderColor: checked ? accentColor : `${accentColor}60` }
    : {};

  return (
    <motion.button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex h-6 w-6 items-center justify-center rounded-lg transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked
          ? 'border-2 border-solid bg-journal-checkbox-bg'
          : 'border-2 border-dashed border-journal-border bg-transparent',
        disabled && 'cursor-not-allowed opacity-50',
        !disabled && 'cursor-pointer',
        className
      )}
      style={borderStyle}
      {...(prefersReducedMotion ? {} : checkboxBounce)}
    >
      {/* Checkmark SVG */}
      {checked && (
        <motion.svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          initial="hidden"
          animate="visible"
        >
          <motion.path
            d="M5 12l5 5L19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-journal-checkbox-checked"
            variants={prefersReducedMotion ? noAnimation : checkmarkPath}
          />
        </motion.svg>
      )}
    </motion.button>
  );
}
