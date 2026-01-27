'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { RecurringScope } from '../types';

// =============================================================================
// Props
// =============================================================================

interface RecurringScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scope: RecurringScope) => void;
  title: string;
  description: string;
  actionLabel: string;
  isDestructive?: boolean;
  isPending?: boolean;
}

// =============================================================================
// Scope Options
// =============================================================================

const scopeOptions: { value: RecurringScope; label: string; description: string }[] = [
  {
    value: 'this',
    label: 'Apenas este mês',
    description: 'Alterar somente este registro',
  },
  {
    value: 'future',
    label: 'Este e futuros',
    description: 'Alterar este e todos os meses futuros',
  },
  {
    value: 'all',
    label: 'Todos',
    description: 'Alterar todos os registros desta série',
  },
];

// =============================================================================
// Component
// =============================================================================

/**
 * RecurringScopeDialog - Dialog for choosing scope of recurring item operations
 *
 * Shows when editing or deleting a recurring finance item, allowing the user
 * to choose whether the operation applies to just this month, this and future
 * months, or all months in the recurring group.
 */
export function RecurringScopeDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  actionLabel,
  isDestructive = false,
  isPending = false,
}: RecurringScopeDialogProps) {
  const [selectedScope, setSelectedScope] = useState<RecurringScope>('this');

  const handleConfirm = () => {
    onConfirm(selectedScope);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="recurring-scope-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2" role="radiogroup" aria-label="Escopo da alteração">
          {scopeOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                selectedScope === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              }`}
              data-testid={`scope-option-${option.value}`}
            >
              <input
                type="radio"
                name="recurring-scope"
                value={option.value}
                checked={selectedScope === option.value}
                onChange={() => setSelectedScope(option.value)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <div className="flex flex-col gap-0.5">
                <span className="cursor-pointer font-medium text-sm">
                  {option.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
            </label>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            data-testid="recurring-scope-cancel"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className={
              isDestructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
            data-testid="recurring-scope-confirm"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
