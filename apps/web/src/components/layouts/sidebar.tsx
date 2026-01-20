'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, Brain, Activity, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Chat',
    href: '/chat',
    icon: MessageSquare,
  },
  {
    name: 'Tracking',
    href: '/tracking',
    icon: Activity,
  },
  {
    name: 'Memória',
    href: '/memory',
    icon: Brain,
  },
  {
    name: 'Configurações',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  // Auto-close sidebar on route change (mobile only)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [pathname, setSidebarOpen]);

  return (
    <>
      {/* Backdrop for mobile (only when expanded) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 border-r bg-background transition-all duration-300',
          // Mobile: hide completely when collapsed, show full when expanded
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible, just change width
          'md:translate-x-0',
          sidebarOpen ? 'w-64' : 'md:w-16'
        )}
        data-testid="sidebar"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div
            className={cn(
              'flex h-14 items-center border-b transition-all duration-300',
              sidebarOpen ? 'px-6' : 'px-0 justify-center'
            )}
          >
            <span
              className={cn(
                'text-sm font-semibold transition-opacity duration-300',
                sidebarOpen ? 'opacity-100' : 'md:opacity-0 md:hidden'
              )}
            >
              Menu
            </span>
          </div>

          {/* Navigation */}
          <ScrollArea className={cn('flex-1', sidebarOpen ? 'p-4' : 'p-2')}>
            <nav className="space-y-2" data-testid="sidebar-nav">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                const linkContent = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-lg text-sm font-medium transition-colors',
                      sidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center p-3',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    data-testid={`sidebar-link-${item.name.toLowerCase()}`}
                  >
                    <item.icon className={cn('h-4 w-4', !sidebarOpen && 'h-5 w-5')} />
                    <span
                      className={cn(
                        'transition-opacity duration-300',
                        sidebarOpen ? 'opacity-100' : 'sr-only'
                      )}
                    >
                      {item.name}
                    </span>
                  </Link>
                );

                // Show tooltip only when collapsed (desktop)
                if (!sidebarOpen) {
                  return (
                    <Tooltip key={item.href} delayDuration={0}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="hidden md:block">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </nav>
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}
