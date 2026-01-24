'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateBill } from '../../hooks/use-bills';
import { BillForm, type BillFormData } from './bill-form';
import { RecurringScopeDialog } from '../recurring-scope-dialog';
import type { Bill, RecurringScope } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface EditBillModalProps {
  bill: Bill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * EditBillModal - Modal for editing an existing bill
 *
 * If the bill is recurring, shows scope selection dialog before applying changes.
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function EditBillModal({
  bill,
  open,
  onOpenChange,
}: EditBillModalProps) {
  const updateBill = useUpdateBill();
  const [pendingData, setPendingData] = useState<BillFormData | null>(null);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);

  const executeUpdate = async (data: BillFormData, scope?: RecurringScope) => {
    if (!bill) return;

    try {
      await updateBill.mutateAsync({
        id: bill.id,
        data: {
          name: data.name,
          category: data.category,
          amount: data.amount,
          dueDay: data.dueDay,
          isRecurring: data.isRecurring,
        },
        scope,
      });

      toast.success('Conta atualizada com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar conta. Tente novamente.');
    }
  };

  const handleSubmit = async (data: BillFormData) => {
    if (!bill) return;

    if (bill.recurringGroupId) {
      setPendingData(data);
      setScopeDialogOpen(true);
    } else {
      await executeUpdate(data);
    }
  };

  const handleScopeConfirm = async (scope: RecurringScope) => {
    if (pendingData) {
      await executeUpdate(pendingData, scope);
      setPendingData(null);
      setScopeDialogOpen(false);
    }
  };

  if (!bill) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]" data-testid="edit-bill-modal">
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
            <DialogDescription>
              Atualize as informações da conta.
            </DialogDescription>
          </DialogHeader>

          <BillForm
            defaultValues={{
              name: bill.name,
              category: bill.category,
              amount: bill.amount,
              dueDay: bill.dueDay,
              isRecurring: bill.isRecurring,
            }}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isSubmitting={updateBill.isPending}
          />
        </DialogContent>
      </Dialog>

      <RecurringScopeDialog
        open={scopeDialogOpen}
        onOpenChange={setScopeDialogOpen}
        onConfirm={handleScopeConfirm}
        title="Editar conta recorrente"
        description="Esta conta faz parte de uma série recorrente. Escolha o escopo da alteração."
        actionLabel="Salvar"
        isPending={updateBill.isPending}
      />
    </>
  );
}
