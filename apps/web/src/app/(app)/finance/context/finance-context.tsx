'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useMonthNavigation } from '../hooks/use-month-navigation';

interface FinanceContextValue {
  currentMonth: string;
  formattedMonth: string;
  isCurrentMonth: boolean;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToMonth: (monthYear: string) => void;
  goToCurrentMonth: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

interface FinanceProviderProps {
  children: ReactNode;
  initialMonth?: string;
}

/**
 * FinanceProvider - Provides month navigation state to finance pages
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function FinanceProvider({ children, initialMonth }: FinanceProviderProps) {
  const monthNavigation = useMonthNavigation(initialMonth);

  return (
    <FinanceContext.Provider value={monthNavigation}>
      {children}
    </FinanceContext.Provider>
  );
}

/**
 * Hook to access finance context
 *
 * @throws Error if used outside FinanceProvider
 */
export function useFinanceContext() {
  const context = useContext(FinanceContext);

  if (!context) {
    throw new Error('useFinanceContext must be used within a FinanceProvider');
  }

  return context;
}
