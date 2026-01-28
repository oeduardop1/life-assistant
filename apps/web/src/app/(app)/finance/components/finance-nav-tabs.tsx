'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  ShoppingCart,
  CreditCard,
  PiggyBank,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { financeTabs } from '../types';

// =============================================================================
// Icon Map
// =============================================================================

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  ShoppingCart,
  CreditCard,
  PiggyBank,
};

// =============================================================================
// Component
// =============================================================================

/**
 * FinanceNavTabs - Pill-style navigation tabs with icons for Finance module
 *
 * Displays tabs for: Visão Geral, Rendas, Contas, Despesas, Dívidas, Investimentos
 * Features:
 * - Pill-style active state (rounded-full with background)
 * - Icons for visual recognition
 * - Horizontal scroll on mobile with fade edges
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function FinanceNavTabs() {
  const pathname = usePathname();

  return (
    <div className="relative">
      {/* Fade edges for scroll indication */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none sm:hidden" />
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none sm:hidden" />

      <nav
        className="flex gap-1 p-1 overflow-x-auto scrollbar-none -mx-1 px-1"
        aria-label="Navegação de finanças"
        data-testid="finance-nav-tabs"
      >
        {financeTabs.map((tab) => {
          const isActive =
            tab.href === '/finance'
              ? pathname === '/finance'
              : pathname.startsWith(tab.href);

          const Icon = iconMap[tab.icon] ?? LayoutDashboard;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-all rounded-full',
                isActive
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              data-testid={`finance-tab-${tab.id}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
