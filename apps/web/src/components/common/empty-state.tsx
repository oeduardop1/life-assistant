import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center',
        className
      )}
    >
      {Icon && (
        <Icon
          className="mb-4 h-12 w-12 text-muted-foreground"
          data-testid="empty-state-icon"
        />
      )}
      <h3 className="mb-2 text-lg font-semibold" data-testid="empty-state-title">
        {title}
      </h3>
      {description && (
        <p
          className="mb-4 text-sm text-muted-foreground"
          data-testid="empty-state-description"
        >
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} data-testid="empty-state-action">
          {action.label}
        </Button>
      )}
    </div>
  );
}
