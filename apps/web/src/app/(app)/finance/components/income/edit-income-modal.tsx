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
import { useUpdateIncome } from '../../hooks/use-incomes';
import { IncomeForm, type IncomeFormData } from './income-form';
import { RecurringScopeDialog } from '../recurring-scope-dialog';
import type { Income, RecurringScope } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface EditIncomeModalProps {
  income: Income | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * EditIncomeModal - Modal for editing an existing income
 *
 * If the income is recurring, shows scope selection dialog before applying changes.
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function EditIncomeModal({
  income,
  open,
  onOpenChange,
}: EditIncomeModalProps) {
  const updateIncome = useUpdateIncome();
  const [pendingData, setPendingData] = useState<IncomeFormData | null>(null);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);

  const executeUpdate = async (data: IncomeFormData, scope?: RecurringScope) => {
    if (!income) return;

    try {
      await updateIncome.mutateAsync({
        id: income.id,
        data: {
          name: data.name,
          type: data.type,
          frequency: data.frequency,
          expectedAmount: data.expectedAmount,
          actualAmount: data.actualAmount,
          isRecurring: data.isRecurring,
        },
        scope,
      });

      toast.success('Renda atualizada com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar renda. Tente novamente.');
    }
  };

  const handleSubmit = async (data: IncomeFormData) => {
    if (!income) return;

    if (income.recurringGroupId) {
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

  if (!income) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]" data-testid="edit-income-modal">
          <DialogHeader>
            <DialogTitle>Editar Renda</DialogTitle>
            <DialogDescription>
              Atualize as informações da renda.
            </DialogDescription>
          </DialogHeader>

          <IncomeForm
            defaultValues={{
              name: income.name,
              type: income.type,
              frequency: income.frequency,
              expectedAmount: income.expectedAmount,
              actualAmount: income.actualAmount,
              isRecurring: income.isRecurring,
            }}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isSubmitting={updateIncome.isPending}
          />
        </DialogContent>
      </Dialog>

      <RecurringScopeDialog
        open={scopeDialogOpen}
        onOpenChange={setScopeDialogOpen}
        onConfirm={handleScopeConfirm}
        title="Editar renda recorrente"
        description="Esta renda faz parte de uma série recorrente. Escolha o escopo da alteração."
        actionLabel="Salvar"
        isPending={updateIncome.isPending}
      />
    </>
  );
}
