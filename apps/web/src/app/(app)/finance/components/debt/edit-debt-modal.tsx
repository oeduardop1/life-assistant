'use client';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateDebt } from '../../hooks/use-debts';
import { DebtForm, type DebtFormData } from './debt-form';
import type { Debt } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface EditDebtModalProps {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * EditDebtModal - Modal for editing an existing debt
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function EditDebtModal({
  debt,
  open,
  onOpenChange,
}: EditDebtModalProps) {
  const updateDebt = useUpdateDebt();

  const handleSubmit = async (data: DebtFormData) => {
    if (!debt) return;

    try {
      await updateDebt.mutateAsync({
        id: debt.id,
        data: {
          name: data.name,
          creditor: data.creditor || undefined,
          totalAmount: data.totalAmount,
          notes: data.notes || undefined,
        },
      });

      toast.success('Dívida atualizada com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar dívida. Tente novamente.');
    }
  };

  if (!debt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="edit-debt-modal">
        <DialogHeader>
          <DialogTitle>Editar Dívida</DialogTitle>
          <DialogDescription>
            Atualize as informações da dívida.
          </DialogDescription>
        </DialogHeader>

        <DebtForm
          defaultValues={{
            name: debt.name,
            creditor: debt.creditor || '',
            totalAmount: debt.totalAmount,
            isNegotiated: debt.isNegotiated,
            totalInstallments: debt.totalInstallments || undefined,
            installmentAmount: debt.installmentAmount || undefined,
            dueDay: debt.dueDay || undefined,
            notes: debt.notes || '',
          }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={updateDebt.isPending}
          hideNegotiatedToggle // Can't change negotiation status in edit
        />
      </DialogContent>
    </Dialog>
  );
}
