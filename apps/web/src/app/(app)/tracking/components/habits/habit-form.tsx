'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  type HabitFrequency,
  type PeriodOfDay,
  habitFrequencyLabels,
  periodOfDayLabels,
} from '../../types';

// Form schema
const habitFormSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
    description: z.string().max(500, 'Descrição muito longa').optional(),
    icon: z.string().min(1, 'Ícone é obrigatório').max(10, 'Ícone muito longo'),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida')
      .optional()
      .or(z.literal('')),
    frequency: z.enum(['daily', 'weekdays', 'weekends', 'custom']),
    frequencyDays: z.array(z.number().min(0).max(6)).optional(),
    periodOfDay: z.enum(['morning', 'afternoon', 'evening', 'anytime']),
  })
  .refine(
    (data) =>
      data.frequency !== 'custom' ||
      (data.frequencyDays && data.frequencyDays.length > 0),
    { message: 'Selecione pelo menos um dia', path: ['frequencyDays'] },
  );

const dayOfWeekLabels = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

type HabitFormValues = z.infer<typeof habitFormSchema>;

interface HabitFormProps {
  /** Initial values for edit mode (includes frequencyDays for custom frequency) */
  defaultValues?: Partial<HabitFormValues> & { frequencyDays?: number[] };
  /** Submit handler */
  onSubmit: (values: HabitFormValues) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Submit button text */
  submitLabel?: string;
}

const defaultEmojis = ['✓', '📚', '🏋️', '🧘', '💧', '🎯', '✍️', '🏃', '😴', '🍎'];

/**
 * HabitForm - Form for creating/editing a habit
 *
 * Fields:
 * - Name (required)
 * - Description (optional)
 * - Icon (emoji)
 * - Color (hex)
 * - Frequency (daily/weekdays/weekends/custom)
 * - Period of day (morning/afternoon/evening/anytime)
 */
export function HabitForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  submitLabel = 'Salvar',
}: HabitFormProps) {
  const form = useForm<HabitFormValues>({
    resolver: standardSchemaResolver(habitFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      icon: defaultValues?.icon ?? '✓',
      color: defaultValues?.color ?? '',
      frequency: defaultValues?.frequency ?? 'daily',
      frequencyDays: defaultValues?.frequencyDays ?? [],
      periodOfDay: defaultValues?.periodOfDay ?? 'anytime',
    },
  });

  const watchedFrequency = form.watch('frequency');

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit({
      ...values,
      color: values.color || undefined,
      description: values.description || undefined,
      frequencyDays:
        values.frequency === 'custom' ? values.frequencyDays : undefined,
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Treino, Leitura, Meditação" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalhes sobre o hábito..."
                  className="resize-none"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Icon */}
        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ícone</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {defaultEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => field.onChange(emoji)}
                        className={`p-2 text-xl rounded-md border transition-colors ${
                          field.value === emoji
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Ou digite um emoji..."
                    {...field}
                    className="w-20"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Frequency */}
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequência</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(
                    Object.entries(habitFrequencyLabels) as [
                      HabitFrequency,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Define em quais dias o hábito deve ser feito
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Custom Frequency Days */}
        {watchedFrequency === 'custom' && (
          <FormField
            control={form.control}
            name="frequencyDays"
            render={({ field }) => {
              const selected = field.value ?? [];
              const toggle = (day: number) => {
                const next = selected.includes(day)
                  ? selected.filter((d) => d !== day)
                  : [...selected, day].sort((a, b) => a - b);
                field.onChange(next);
              };
              return (
                <FormItem>
                  <FormLabel>Dias da semana</FormLabel>
                  <FormControl>
                    <div className="flex gap-1.5">
                      {dayOfWeekLabels.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggle(value)}
                          className={cn(
                            'h-9 w-9 rounded-full text-xs font-medium transition-colors',
                            selected.includes(value)
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-input hover:bg-muted',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        )}

        {/* Period of Day */}
        <FormField
          control={form.control}
          name="periodOfDay"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Período do dia</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(
                    Object.entries(periodOfDayLabels) as [PeriodOfDay, string][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Quando você prefere fazer este hábito
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
