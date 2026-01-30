'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
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
import {
  updatePasswordSchema,
  type UpdatePasswordData,
  MIN_PASSWORD_SCORE,
} from '@/lib/validations/settings';
import { PasswordStrengthMeter, usePasswordStrength } from './password-strength-meter';

interface PasswordSectionProps {
  userEmail: string;
  userName: string;
  onSubmit: (data: UpdatePasswordData) => Promise<{ success: boolean; message?: string }>;
}

/**
 * PasswordSection - Change user password with strength validation
 */
export function PasswordSection({ userEmail, userName, onSubmit }: PasswordSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const form = useForm<UpdatePasswordData>({
    resolver: standardSchemaResolver(updatePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

  const newPassword = form.watch('newPassword');
  const passwordStrength = usePasswordStrength(newPassword, [userEmail, userName]);
  const isPasswordStrong = passwordStrength ? passwordStrength.score >= MIN_PASSWORD_SCORE : false;

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!isPasswordStrong) {
      form.setError('newPassword', {
        message: 'A senha deve ter pelo menos nível "Razoável"',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await onSubmit(data);
      if (result.success) {
        toast.success('Senha alterada com sucesso');
        form.reset();
      } else {
        toast.error(result.message || 'Erro ao alterar senha');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao alterar senha',
      );
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Header with gradient accent */}
      <div className="relative px-6 py-5 border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-transparent" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Lock className="w-6 h-6 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Senha</h2>
            <p className="text-sm text-muted-foreground">
              Atualize sua senha de acesso
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
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
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="Digite sua senha atual"
                          autoComplete="current-password"
                          className={cn(
                            'h-11 px-4 pr-12 rounded-xl border-border/50 bg-background/50 transition-all duration-200',
                            'focus:bg-background focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20'
                          )}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted/50 transition-colors"
                          tabIndex={-1}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="sr-only">
                            {showCurrentPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          </span>
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Nova senha
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Digite a nova senha"
                          autoComplete="new-password"
                          className={cn(
                            'h-11 px-4 pr-12 rounded-xl border-border/50 bg-background/50 transition-all duration-200',
                            'focus:bg-background focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20'
                          )}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted/50 transition-colors"
                          tabIndex={-1}
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="sr-only">
                            {showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          </span>
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Password strength meter */}
            <PasswordStrengthMeter
              password={newPassword}
              userInputs={[userEmail, userName]}
            />

            {/* Security tips */}
            <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Dicas para uma senha forte
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                      Mínimo de 8 caracteres
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                      Combine letras maiúsculas e minúsculas
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                      Inclua números e símbolos especiais
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                      Evite informações pessoais óbvias
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isLoading || !isPasswordStrong}
                className={cn(
                  'h-10 px-5 rounded-xl font-medium transition-all duration-200',
                  'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
                  'shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                  'disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Alterar senha'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
