'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, Brain, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r bg-background transition-transform duration-300',
          'md:translate-x-0 md:z-30',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        data-testid="sidebar"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b px-6">
            <span className="text-sm font-semibold">Menu</span>
          </div>

          <Separator />

          <ScrollArea className="flex-1 p-4">
            <nav className="space-y-2" data-testid="sidebar-nav">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    data-testid={`sidebar-link-${item.name.toLowerCase()}`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}
