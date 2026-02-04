'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import TimezoneSelect, { type ITimezone } from 'react-timezone-select';
import { Globe, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { updateTimezoneSchema, type UpdateTimezoneData } from '@/lib/validations/settings';

interface PreferencesSectionProps {
  currentTimezone: string;
  onSubmit: (data: UpdateTimezoneData) => Promise<{ success: boolean; message?: string }>;
}

/**
 * PreferencesSection - Edit user preferences (timezone)
 */
export function PreferencesSection({ currentTimezone, onSubmit }: PreferencesSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<UpdateTimezoneData>({
    resolver: standardSchemaResolver(updateTimezoneSchema),
    defaultValues: {
      timezone: currentTimezone,
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsLoading(true);
    setShowSuccess(false);
    try {
      const result = await onSubmit(data);
      if (result.success) {
        setShowSuccess(true);
        toast.success('Preferências atualizadas com sucesso');
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        toast.error(result.message || 'Erro ao atualizar preferências');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao atualizar preferências',
      );
    } finally {
      setIsLoading(false);
    }
  });

  const isDirty = form.formState.isDirty;

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Header with gradient accent */}
      <div className="relative px-6 py-5 border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <Globe className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Preferências</h2>
            <p className="text-sm text-muted-foreground">
              Configure seu fuso horário e preferências regionais
            </p>
          </div>
          {showSuccess && (
            <div className="ml-auto">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center animate-in zoom-in-50 duration-200">
                <Check className="w-5 h-5 text-green-500" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Fuso horário
                  </FormLabel>
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
                          cn(
                            'flex min-h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 py-2 text-sm transition-all duration-200',
                            'hover:border-emerald-500/30 focus-within:bg-background focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20'
                          ),
                        menu: () => 'rounded-xl border bg-popover text-popover-foreground shadow-lg mt-1',
                        menuList: () => 'p-1 max-h-60',
                        option: () => 'relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                        singleValue: () => 'text-foreground',
                        input: () => 'text-foreground',
                        placeholder: () => 'text-muted-foreground',
                      }}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground mt-2">
                    Este fuso horário é usado para exibir datas, horários e lembretes corretamente.
                    Dados históricos mantêm a data original ao alterar o fuso horário.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Alterações afetam novos registros apenas
              </p>
              <Button
                type="submit"
                disabled={isLoading || !isDirty}
                className={cn(
                  'h-10 px-5 rounded-xl font-medium transition-all duration-200',
                  'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
                  'shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40',
                  'disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar alterações'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
