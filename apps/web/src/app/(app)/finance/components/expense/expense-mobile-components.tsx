'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import {
  Plus,
  Wallet,
  Edit3,
  Trash2,
  RefreshCw,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// =============================================================================
// Types
// =============================================================================

interface ActionItem {
  id: string;
  label: string;
  icon: typeof Wallet;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'success';
  disabled?: boolean;
}

// =============================================================================
// Bottom Sheet Component
// =============================================================================

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  actions?: ActionItem[];
}

const variantStyles = {
  default: 'text-foreground hover:bg-muted',
  destructive: 'text-destructive hover:bg-destructive/10',
  success: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10',
};

/**
 * BottomSheet - Mobile-friendly action sheet using vaul
 *
 * Features:
 * - Smooth drag-to-dismiss
 * - Touch-friendly action buttons
 * - Visual feedback on interaction
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-auto flex-col rounded-t-2xl bg-background">
          {/* Handle */}
          <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-muted" />

          {/* Header */}
          {(title || description) && (
            <div className="px-6 pt-4 pb-2">
              {title && (
                <Drawer.Title className="text-lg font-semibold">
                  {title}
                </Drawer.Title>
              )}
              {description && (
                <Drawer.Description className="text-sm text-muted-foreground mt-1">
                  {description}
                </Drawer.Description>
              )}
            </div>
          )}

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="px-4 py-4 space-y-1">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    action.onClick();
                    onOpenChange(false);
                  }}
                  disabled={action.disabled}
                  className={cn(
                    'w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-colors',
                    variantStyles[action.variant || 'default'],
                    action.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <action.icon className="h-5 w-5" />
                  <span className="text-base font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Custom Content */}
          {children && <div className="px-6 pb-6">{children}</div>}

          {/* Cancel Button */}
          <div className="px-4 pb-8">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-12 text-base"
            >
              Cancelar
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// =============================================================================
// Expense Actions Bottom Sheet
// =============================================================================

interface ExpenseActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseName: string;
  onQuickUpdate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * ExpenseActionsSheet - Pre-configured bottom sheet for expense actions
 */
export function ExpenseActionsSheet({
  open,
  onOpenChange,
  expenseName,
  onQuickUpdate,
  onEdit,
  onDelete,
}: ExpenseActionsSheetProps) {
  const actions: ActionItem[] = [];

  if (onQuickUpdate) {
    actions.push({
      id: 'quick-update',
      label: 'Atualizar Valor Real',
      icon: RefreshCw,
      onClick: onQuickUpdate,
      variant: 'success',
    });
  }

  if (onEdit) {
    actions.push({
      id: 'edit',
      label: 'Editar Despesa',
      icon: Edit3,
      onClick: onEdit,
    });
  }

  if (onDelete) {
    actions.push({
      id: 'delete',
      label: 'Excluir',
      icon: Trash2,
      onClick: onDelete,
      variant: 'destructive',
    });
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={expenseName}
      description="Escolha uma ação"
      actions={actions}
    />
  );
}

// =============================================================================
// Floating Action Button
// =============================================================================

interface FABProps {
  onClick: () => void;
  icon?: typeof Plus;
  label?: string;
  className?: string;
}

/**
 * FAB - Floating Action Button (always visible on mobile)
 */
export function FAB({ onClick, icon: Icon = Plus, label, className }: FABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-40 sm:hidden',
        'flex items-center gap-2 px-5 py-4',
        'bg-foreground text-background',
        'rounded-full shadow-lg shadow-foreground/20',
        'active:scale-95 transition-transform',
        className
      )}
    >
      <Icon className="h-5 w-5" />
      {label && (
        <span className="text-sm font-medium pr-1">{label}</span>
      )}
    </button>
  );
}

// =============================================================================
// Scroll to Top Button
// =============================================================================

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
}

/**
 * ScrollToTop - Button that appears after scrolling down
 * Uses native scroll event with passive listener for better performance
 */
export function ScrollToTop({ threshold = 400, className }: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    let lastVisible = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldBeVisible = window.scrollY > threshold;
          // Only update state if visibility changed
          if (shouldBeVisible !== lastVisible) {
            lastVisible = shouldBeVisible;
            setVisible(shouldBeVisible);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        'fixed bottom-6 left-6 z-40',
        'flex items-center justify-center w-10 h-10',
        'bg-muted hover:bg-muted/80',
        'rounded-full shadow-md',
        'active:scale-90 transition-all',
        className
      )}
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}

// =============================================================================
// Mobile Card Actions Overlay
// =============================================================================

interface MobileCardActionsProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * MobileCardActions - Overlay for card actions on mobile
 */
export function MobileCardActions({ visible, onClose, children }: MobileCardActionsProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-xl flex items-center justify-center z-10"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="flex gap-3"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
