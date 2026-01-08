'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useUIStore } from '@/stores/ui-store';
import { Separator } from '@/components/ui/separator';

export function Header() {
  const { toggleSidebar } = useUIStore();

  return (
    <header
      className="sticky top-0 z-40 border-b bg-background"
      data-testid="header"
    >
      <div className="flex h-14 items-center gap-4 px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          data-testid="sidebar-toggle"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-lg font-semibold">Life Assistant AI</h1>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
