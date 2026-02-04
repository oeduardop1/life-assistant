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
import { type LifeArea, lifeAreaLabels } from '../../types';

// Form schema - using strings for min/max to avoid type issues with react-hook-form
const customMetricFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').optional().or(z.literal('')),
  icon: z.string().min(1, 'Ícone é obrigatório').max(10, 'Ícone muito longo'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida')
    .optional()
    .or(z.literal('')),
  unit: z.string().min(1, 'Unidade é obrigatória').max(20, 'Unidade muito longa'),
  minValue: z.string().optional(),
  maxValue: z.string().optional(),
  area: z.enum([
    'health',
    'finance',
    'professional',
    'learning',
    'spiritual',
    'relationships',
  ]),
}).refine((data) => {
  // Validate minValue <= maxValue if both provided
  const minVal = data.minValue ? parseFloat(data.minValue) : null;
  const maxVal = data.maxValue ? parseFloat(data.maxValue) : null;
  if (minVal !== null && maxVal !== null && !isNaN(minVal) && !isNaN(maxVal)) {
    return minVal <= maxVal;
  }
  return true;
}, {
  message: 'Valor mínimo não pode ser maior que o máximo',
  path: ['minValue'],
});

type CustomMetricFormValues = z.infer<typeof customMetricFormSchema>;

// Interface for submit handler - uses proper types for min/max
interface CustomMetricFormSubmitValues {
  name: string;
  description?: string;
  icon: string;
  color?: string;
  unit: string;
  minValue?: number;
  maxValue?: number;
  area: LifeArea;
}

interface CustomMetricFormProps {
  /** Initial values for edit mode */
  defaultValues?: Partial<CustomMetricFormValues>;
  /** Submit handler */
  onSubmit: (values: CustomMetricFormSubmitValues) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Submit button text */
  submitLabel?: string;
}

const defaultEmojis = ['📊', '📚', '💪', '🏃', '💧', '🎯', '⏱️', '📈', '🎓', '✨'];

/**
 * CustomMetricForm - Form for creating/editing a custom metric definition
 *
 * Fields:
 * - Name (required)
 * - Description (optional)
 * - Icon (emoji)
 * - Color (hex)
 * - Unit (required)
 * - Min/Max Value (optional validation)
 * - Area (life area categorization)
 */
export function CustomMetricForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  submitLabel = 'Salvar',
}: CustomMetricFormProps) {
  const form = useForm<CustomMetricFormValues>({
    resolver: standardSchemaResolver(customMetricFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      icon: defaultValues?.icon ?? '📊',
      color: defaultValues?.color ?? '',
      unit: defaultValues?.unit ?? '',
      minValue: defaultValues?.minValue ?? '',
      maxValue: defaultValues?.maxValue ?? '',
      area: defaultValues?.area ?? 'learning',
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    const minVal = values.minValue ? parseFloat(values.minValue) : undefined;
    const maxVal = values.maxValue ? parseFloat(values.maxValue) : undefined;

    onSubmit({
      name: values.name,
      description: values.description || undefined,
      icon: values.icon,
      color: values.color || undefined,
      unit: values.unit,
      minValue: minVal !== undefined && !isNaN(minVal) ? minVal : undefined,
      maxValue: maxVal !== undefined && !isNaN(maxVal) ? maxVal : undefined,
      area: values.area,
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
                <Input placeholder="Ex: Livros Lidos, Pressão Arterial" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unit */}
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidade</FormLabel>
              <FormControl>
                <Input placeholder="Ex: livros, mmHg, páginas" {...field} />
              </FormControl>
              <FormDescription>
                Unidade de medida (será exibida ao lado do valor)
              </FormDescription>
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
                  placeholder="Detalhes sobre a métrica..."
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

        {/* Min/Max Values */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Mínimo (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="Ex: 0"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Máximo (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="Ex: 100"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormDescription className="-mt-2">
          Valores opcionais para validação ao registrar
        </FormDescription>

        {/* Area */}
        <FormField
          control={form.control}
          name="area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Área da Vida</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(
                    Object.entries(lifeAreaLabels) as [LifeArea, string][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Categoriza a métrica no Life Balance Score
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
