'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useCreateTrackingEntry } from '../hooks/use-tracking';
import {
  type TrackingType,
  type LifeArea,
  trackingTypeLabels,
  trackingTypeIcons,
  defaultUnits,
  validationRules,
} from '../types';

interface FormData {
  type: TrackingType;
  value: string;
  unit: string;
  entryDate: string;
  entryTime: string;
}

interface ManualTrackFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: TrackingType;
  /** Default date for the entry (YYYY-MM-DD format). If provided, pre-fills the date field. */
  defaultDate?: string;
}

/**
 * Manual tracking entry form
 *
 * @see docs/specs/system.md §3.3 for validation rules
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
export function ManualTrackForm({
  open,
  onOpenChange,
  defaultType = 'weight',
  defaultDate,
}: ManualTrackFormProps) {
  const createEntry = useCreateTrackingEntry();
  const [selectedType, setSelectedType] = useState<TrackingType>(defaultType);

  const rules = validationRules[selectedType];
  const defaultUnit = defaultUnits[selectedType];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      type: defaultType,
      value: '',
      unit: defaultUnit,
      entryDate: defaultDate || new Date().toISOString().split('T')[0],
      entryTime: '',
    },
  });

  // Update entryDate when defaultDate changes (e.g., when opening from DayDetailModal)
  useEffect(() => {
    if (defaultDate) {
      setValue('entryDate', defaultDate);
    }
  }, [defaultDate, setValue]);

  const handleTypeChange = (type: TrackingType) => {
    setSelectedType(type);
    setValue('type', type);
    setValue('unit', defaultUnits[type]);
  };

  const onSubmit = async (data: FormData) => {
    const value = parseFloat(data.value);
    if (isNaN(value) || value <= 0) {
      toast.error('Valor invalido.');
      return;
    }

    // Validate against rules
    if (rules.min !== undefined && value < rules.min) {
      toast.error(`Valor minimo: ${rules.min}`);
      return;
    }
    if (rules.max !== undefined && value > rules.max) {
      toast.error(`Valor maximo: ${rules.max}`);
      return;
    }

    try {
      // Map tracking type to life area (ADR-017: 6 main areas)
      const areaMap: Record<TrackingType, LifeArea> = {
        weight: 'health',
        water: 'health',
        sleep: 'health',
        exercise: 'health',
        mood: 'health', // mental is now a sub-area of health
        energy: 'health',
        custom: 'learning', // personal_growth renamed to learning
      };

      // Combine date and time into ISO 8601 if time is provided
      let entryTime: string | undefined;
      if (data.entryTime) {
        // data.entryTime is "HH:mm", combine with date to create ISO 8601
        entryTime = `${data.entryDate}T${data.entryTime}:00`;
      }

      await createEntry.mutateAsync({
        type: data.type,
        area: areaMap[data.type],
        value,
        unit: data.unit || defaultUnit,
        entryDate: data.entryDate,
        entryTime,
        source: 'form',
      });

      toast.success(`${trackingTypeLabels[data.type]}: ${value} ${data.unit || defaultUnit}`);

      onOpenChange(false);
      reset();
    } catch {
      toast.error('Erro ao salvar. Tente novamente em alguns instantes.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Metrica</DialogTitle>
          <DialogDescription>
            Adicione um registro manual de suas metricas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type selector */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => handleTypeChange(value as TrackingType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(trackingTypeLabels) as TrackingType[]).map((type) => {
                  const Icon = trackingTypeIcons[type];
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {trackingTypeLabels[type]}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <input type="hidden" {...register('type')} />
          </div>

          {/* Value input */}
          <div className="space-y-2">
            <Label htmlFor="value">Valor</Label>
            <div className="flex gap-2">
              <Input
                id="value"
                type="number"
                step={rules.step ?? 0.1}
                min={rules.min}
                max={rules.max}
                placeholder={`Ex: ${rules.min ?? 0}`}
                {...register('value', { required: 'Valor obrigatorio' })}
              />
              <Input
                id="unit"
                className="w-24"
                placeholder={defaultUnit}
                {...register('unit')}
              />
            </div>
            {rules.min !== undefined && rules.max !== undefined && (
              <p className="text-xs text-muted-foreground">
                Entre {rules.min} e {rules.max} {defaultUnit}
              </p>
            )}
            {errors.value && (
              <p className="text-xs text-destructive">
                {errors.value.message}
              </p>
            )}
          </div>

          {/* Date input */}
          <div className="space-y-2">
            <Label htmlFor="entryDate">Data</Label>
            <Input
              id="entryDate"
              type="date"
              {...register('entryDate', { required: 'Data obrigatoria' })}
            />
            {errors.entryDate && (
              <p className="text-xs text-destructive">
                {errors.entryDate.message}
              </p>
            )}
          </div>

          {/* Time input (optional) */}
          <div className="space-y-2">
            <Label htmlFor="entryTime">Horario (opcional)</Label>
            <Input
              id="entryTime"
              type="time"
              {...register('entryTime')}
            />
          </div>

          {/* Submit button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createEntry.isPending}>
              {createEntry.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
