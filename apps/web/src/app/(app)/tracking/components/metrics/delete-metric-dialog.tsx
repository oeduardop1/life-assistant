'use client';

import { Loader2 } from 'lucide-react';
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
import { useDeleteTrackingEntry } from '../../hooks/use-tracking';
import { trackingTypeLabels, type TrackingEntry } from '../../types';

interface DeleteMetricDialogProps {
  entry: TrackingEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation dialog for deleting a tracking entry
 *
 * @see docs/specs/domains/tracking.md §3.5 for metrics page specification
 */
export function DeleteMetricDialog({
  entry,
  open,
  onOpenChange,
}: DeleteMetricDialogProps) {
  const deleteEntry = useDeleteTrackingEntry();

  const handleDelete = async () => {
    if (!entry) return;

    try {
      await deleteEntry.mutateAsync(entry.id);
      toast.success('Métrica excluída com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao excluir métrica');
    }
  };

  const formattedDate = entry
    ? new Date(entry.entryDate + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir métrica?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este registro de{' '}
            <strong>{entry ? trackingTypeLabels[entry.type] : ''}</strong> do
            dia <strong>{formattedDate}</strong>?
            <br />
            <br />
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteEntry.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteEntry.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
