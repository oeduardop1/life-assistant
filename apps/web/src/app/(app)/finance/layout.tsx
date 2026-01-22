'use client';

import type { ReactNode } from 'react';
import { FinanceProvider, useFinanceContext } from './context/finance-context';
import { MonthSelector } from './components/month-selector';
import { FinanceNavTabs } from './components/finance-nav-tabs';

interface FinanceLayoutProps {
  children: ReactNode;
}

/**
 * Finance Layout Header with MonthSelector
 */
function FinanceHeader() {
  const {
    currentMonth,
    formattedMonth,
    goToPrevMonth,
    goToNextMonth,
    goToCurrentMonth,
  } = useFinanceContext();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold">Finanças</h1>
      <MonthSelector
        currentMonth={currentMonth}
        formattedMonth={formattedMonth}
        onPrevMonth={goToPrevMonth}
        onNextMonth={goToNextMonth}
        onCurrentMonth={goToCurrentMonth}
      />
    </div>
  );
}

/**
 * Finance Layout Content
 */
function FinanceLayoutContent({ children }: FinanceLayoutProps) {
  return (
    <div className="flex flex-col gap-6">
      <FinanceHeader />
      <FinanceNavTabs />
      <main>{children}</main>
    </div>
  );
}

/**
 * FinanceLayout - Shared layout for all finance pages
 *
 * Provides:
 * - Page title "Finanças"
 * - MonthSelector for month navigation
 * - FinanceNavTabs for sub-navigation
 * - FinanceContext for shared state
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export default function FinanceLayout({ children }: FinanceLayoutProps) {
  return (
    <FinanceProvider>
      <FinanceLayoutContent>{children}</FinanceLayoutContent>
    </FinanceProvider>
  );
}
