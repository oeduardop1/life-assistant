'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { financeTabs } from '../types';

/**
 * FinanceNavTabs - Horizontal navigation tabs for Finance module
 *
 * Displays tabs for: Visão Geral, Rendas, Contas, Despesas, Dívidas, Investimentos
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function FinanceNavTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 border-b overflow-x-auto"
      aria-label="Navegação de finanças"
      data-testid="finance-nav-tabs"
    >
      {financeTabs.map((tab) => {
        const isActive =
          tab.href === '/finance'
            ? pathname === '/finance'
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              'px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              'border-b-2 -mb-px',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            )}
            data-testid={`finance-tab-${tab.id}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
