'use client';

import { Menu, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useUIStore } from '@/stores/ui-store';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export function Header() {
  const router = useRouter();
  const { toggleSidebar } = useUIStore();
  const { logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logout realizado com sucesso!');
      router.push('/');
    } catch {
      toast.error('Erro ao fazer logout');
    }
  };

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
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                data-testid="logout-button"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
