'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { dateHeaderEntrance, noAnimation } from './animations';

interface DateHeaderProps {
  /** Date string in YYYY-MM-DD format */
  date: string;
  /** Whether this date is today */
  isToday: boolean;
  /** Optional className */
  className?: string;
}

/**
 * DateHeader - Large, prominent date display for the day detail modal
 *
 * Features:
 * - Day number as visual protagonist (large text)
 * - Month and year as subtitle
 * - Day of week label
 * - "Hoje" badge when applicable
 * - Entrance animation with scale effect
 *
 * @see docs/specs/domains/tracking.md for day detail view
 */
export function DateHeader({ date, isToday, className }: DateHeaderProps) {
  const prefersReducedMotion = useReducedMotion();

  // Parse date components
  const dateObj = new Date(date + 'T00:00:00');
  const day = dateObj.getDate();
  const monthNames = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  const dayOfWeekNames = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado',
  ];
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  const dayOfWeek = dayOfWeekNames[dateObj.getDay()];

  return (
    <motion.div
      className={cn('flex flex-col items-center py-4', className)}
      initial="hidden"
      animate="visible"
      variants={prefersReducedMotion ? noAnimation : dateHeaderEntrance}
    >
      {/* Today badge */}
      {isToday && (
        <motion.span
          className="mb-2 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Hoje
        </motion.span>
      )}

      {/* Day of week */}
      <span className="text-xs uppercase tracking-widest text-journal-ink-soft">
        {dayOfWeek}
      </span>

      {/* Large day number */}
      <motion.span
        className={cn(
          'font-bold leading-none text-journal-ink',
          'text-5xl sm:text-6xl',
          isToday && 'text-primary'
        )}
        initial={prefersReducedMotion ? {} : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: 0.1,
        }}
      >
        {day}
      </motion.span>

      {/* Month and year */}
      <span className="mt-1 text-sm text-journal-ink-soft">
        {month} {year}
      </span>
    </motion.div>
  );
}
