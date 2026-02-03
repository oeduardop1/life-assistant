'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateTrackingEntry } from '../../hooks/use-tracking';
import {
  trackingTypeLabels,
  defaultUnits,
  validationRules,
  type TrackingEntry,
} from '../../types';

interface EditMetricModalProps {
  entry: TrackingEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditMetricFormData {
  value: string;
  entryDate: string;
  entryTime: string;
}

/**
 * Modal for editing an existing tracking entry
 *
 * @see docs/specs/domains/tracking.md §3.5 for metrics page specification
 */
export function EditMetricModal({
  entry,
  open,
  onOpenChange,
}: EditMetricModalProps) {
  const updateEntry = useUpdateTrackingEntry();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditMetricFormData>({
    defaultValues: {
      value: '',
      entryDate: '',
      entryTime: '',
    },
  });

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      reset({
        value: entry.value,
        entryDate: entry.entryDate,
        entryTime: entry.entryTime
          ? new Date(entry.entryTime).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          : '',
      });
    }
  }, [entry, reset]);

  const onSubmit = async (data: EditMetricFormData) => {
    if (!entry) return;

    try {
      await updateEntry.mutateAsync({
        entryId: entry.id,
        data: {
          value: parseFloat(data.value),
          entryDate: data.entryDate,
          entryTime: data.entryTime
            ? `${data.entryDate}T${data.entryTime}:00`
            : undefined,
        },
      });

      toast.success('Métrica atualizada com sucesso');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar métrica');
    }
  };

  const rules = entry ? validationRules[entry.type] : {};
  const unit = entry ? defaultUnits[entry.type] : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Editar {entry ? trackingTypeLabels[entry.type] : 'Métrica'}
          </DialogTitle>
          <DialogDescription>
            Altere os valores da métrica abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="value">Valor ({unit})</Label>
            <Input
              id="value"
              type="number"
              step={rules.step ?? 'any'}
              min={rules.min}
              max={rules.max}
              {...register('value', {
                required: 'Valor é obrigatório',
                min: rules.min
                  ? { value: rules.min, message: `Mínimo: ${rules.min}` }
                  : undefined,
                max: rules.max
                  ? { value: rules.max, message: `Máximo: ${rules.max}` }
                  : undefined,
              })}
            />
            {errors.value && (
              <p className="text-sm text-destructive">{errors.value.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="entryDate">Data</Label>
            <Input
              id="entryDate"
              type="date"
              {...register('entryDate', {
                required: 'Data é obrigatória',
              })}
            />
            {errors.entryDate && (
              <p className="text-sm text-destructive">
                {errors.entryDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="entryTime">Hora (opcional)</Label>
            <Input id="entryTime" type="time" {...register('entryTime')} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateEntry.isPending}>
              {updateEntry.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
