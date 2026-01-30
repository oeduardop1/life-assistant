'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Mail, Eye, EyeOff, AlertCircle, Loader2, Send } from 'lucide-react';
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
import { updateEmailSchema, type UpdateEmailData } from '@/lib/validations/settings';

interface EmailSectionProps {
  currentEmail: string;
  onSubmit: (data: UpdateEmailData) => Promise<{ success: boolean; message?: string }>;
}

/**
 * EmailSection - Change user email with password verification
 */
export function EmailSection({ currentEmail, onSubmit }: EmailSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<UpdateEmailData>({
    resolver: standardSchemaResolver(updateEmailSchema),
    defaultValues: {
      newEmail: '',
      currentPassword: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const result = await onSubmit(data);
      if (result.success) {
        toast.success(result.message || 'Email de verificação enviado');
        form.reset();
      } else {
        toast.error(result.message || 'Erro ao alterar email');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao alterar email',
      );
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Header with gradient accent */}
      <div className="relative px-6 py-5 border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-transparent" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
            <Mail className="w-6 h-6 text-violet-500 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Email</h2>
            <p className="text-sm text-muted-foreground">
              Altere seu endereço de email
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current email display */}
            <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email atual
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {currentEmail}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500" title="Verificado" />
              </div>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Novo email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="novo@email.com"
                        autoComplete="email"
                        className={cn(
                          'h-11 px-4 rounded-xl border-border/50 bg-background/50 transition-all duration-200',
                          'focus:bg-background focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20'
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Senha atual
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Digite sua senha"
                          autoComplete="current-password"
                          className={cn(
                            'h-11 px-4 pr-12 rounded-xl border-border/50 bg-background/50 transition-all duration-200',
                            'focus:bg-background focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20'
                          )}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted/50 transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="sr-only">
                            {showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          </span>
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Info callout */}
            <div className="rounded-xl bg-violet-500/5 border border-violet-500/10 p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Verificação necessária
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enviaremos um link de verificação para o novo email. Seu email atual permanecerá ativo até a confirmação.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'h-10 px-5 rounded-xl font-medium transition-all duration-200',
                  'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600',
                  'shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40',
                  'disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar verificação
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
