'use client';

import { toast } from 'sonner';
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
import { useDeleteCustomMetric } from '../../hooks';
import type { CustomMetricDefinition } from '../../types';

interface DeleteCustomMetricDialogProps {
  metric: CustomMetricDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation dialog for deleting a custom metric definition
 */
export function DeleteCustomMetricDialog({
  metric,
  open,
  onOpenChange,
}: DeleteCustomMetricDialogProps) {
  const deleteMutation = useDeleteCustomMetric();

  if (!metric) return null;

  const handleDelete = () => {
    deleteMutation.mutate(metric.id, {
      onSuccess: () => {
        toast.success(`"${metric.name}" foi removida com sucesso.`);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || 'Erro ao remover métrica. Tente novamente.');
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover métrica?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a remover a métrica &quot;{metric.name}&quot;. Os registros
            existentes serão preservados, mas você não poderá mais adicionar
            novos valores para esta métrica.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
