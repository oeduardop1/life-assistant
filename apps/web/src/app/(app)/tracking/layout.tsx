'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Lightbulb, Flame, ListChecks, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrackingProvider } from './context/tracking-context';
import { MonthSelector } from './components/month-selector';
import { trackingTabs, type TrackingTab } from './types';

const tabIcons: Record<TrackingTab, typeof Calendar> = {
  calendar: Calendar,
  metrics: TrendingUp,
  insights: Lightbulb,
  streaks: Flame,
  habits: ListChecks,
};

/**
 * TrackingLayout - Layout with tabs and month selector for tracking pages
 *
 * Structure:
 * ┌─────────────────────────────────────────┐
 * │ Tracking          ◄ Janeiro 2026 ►      │
 * ├─────────────────────────────────────────┤
 * │ [Calendário] [Insights] [Streaks]       │
 * ├─────────────────────────────────────────┤
 * │ {children}                              │
 * └─────────────────────────────────────────┘
 *
 * @see docs/specs/domains/tracking.md §3.1 for UI structure
 */
export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Determine active tab from pathname
  const activeTab = trackingTabs.find((tab) => {
    if (tab.href === '/tracking') {
      return pathname === '/tracking';
    }
    return pathname.startsWith(tab.href);
  })?.id ?? 'calendar';

  return (
    <TrackingProvider>
      <div className="space-y-6">
        {/* Header with title and month selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">Tracking</h1>
          <MonthSelector />
        </div>

        {/* Tab navigation */}
        <nav className="flex border-b" aria-label="Tabs">
          {trackingTabs.map((tab) => {
            const Icon = tabIcons[tab.id];
            const isActive = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Page content */}
        {children}
      </div>
    </TrackingProvider>
  );
}
