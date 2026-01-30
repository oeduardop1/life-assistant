'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { User, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { updateProfileSchema, type UpdateProfileData } from '@/lib/validations/settings';

interface ProfileSectionProps {
  defaultName: string;
  onSubmit: (data: UpdateProfileData) => Promise<{ success: boolean; message?: string }>;
}

/**
 * ProfileSection - Edit user profile name
 */
export function ProfileSection({ defaultName, onSubmit }: ProfileSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<UpdateProfileData>({
    resolver: standardSchemaResolver(updateProfileSchema),
    defaultValues: {
      name: defaultName,
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsLoading(true);
    setShowSuccess(false);
    try {
      const result = await onSubmit(data);
      if (result.success) {
        setShowSuccess(true);
        toast.success('Perfil atualizado com sucesso');
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        toast.error(result.message || 'Erro ao atualizar perfil');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao atualizar perfil',
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
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-transparent" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
            <User className="w-6 h-6 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Perfil</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie suas informações pessoais
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Nome completo
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Digite seu nome"
                        autoComplete="name"
                        className={cn(
                          'h-11 px-4 rounded-xl border-border/50 bg-background/50 transition-all duration-200',
                          'focus:bg-background focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                        )}
                        {...field}
                      />
                      {showSuccess && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center animate-in zoom-in-50 duration-200">
                            <Check className="w-4 h-4 text-green-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Este nome será exibido em toda a plataforma
              </p>
              <Button
                type="submit"
                disabled={isLoading || !isDirty}
                className={cn(
                  'h-10 px-5 rounded-xl font-medium transition-all duration-200',
                  'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
                  'shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40',
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
