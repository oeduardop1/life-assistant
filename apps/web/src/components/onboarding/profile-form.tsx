'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TimezoneSelect, { type ITimezone } from 'react-timezone-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { profileStepSchema, type ProfileStepData } from '@/lib/validations/onboarding';
import { SYSTEM_DEFAULTS } from '@life-assistant/shared';

interface ProfileFormProps {
  defaultValues?: Partial<ProfileStepData>;
  onSubmit: (data: ProfileStepData) => Promise<void>;
  isLoading?: boolean;
}

/**
 * ProfileForm - First step of onboarding wizard
 *
 * Collects:
 * - User name (minimum 2 characters)
 * - Timezone (IANA format)
 *
 * @see SYSTEM_SPECS.md §3.1 for validation requirements
 */
export function ProfileForm({
  defaultValues,
  onSubmit,
  isLoading = false,
}: ProfileFormProps) {
  const form = useForm<ProfileStepData>({
    resolver: zodResolver(profileStepSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      timezone: defaultValues?.timezone ?? SYSTEM_DEFAULTS.timezone,
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Como podemos te chamar?</FormLabel>
              <FormControl>
                <Input
                  placeholder="Seu nome ou apelido"
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Este nome aparecerá nas conversas com a IA.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fuso horário</FormLabel>
              <FormControl>
                <TimezoneSelect
                  value={field.value}
                  onChange={(tz: ITimezone) => {
                    const value = typeof tz === 'string' ? tz : tz.value;
                    field.onChange(value);
                  }}
                  labelStyle="original"
                  className="react-timezone-select"
                  classNames={{
                    control: () =>
                      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                    menu: () => 'rounded-md border bg-popover text-popover-foreground shadow-md',
                    option: () => 'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    singleValue: () => 'text-foreground',
                    input: () => 'text-foreground',
                  }}
                />
              </FormControl>
              <FormDescription>
                Usado para agendar lembretes e exibir horários corretamente.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Continuar'}
        </Button>
      </form>
    </Form>
  );
}
