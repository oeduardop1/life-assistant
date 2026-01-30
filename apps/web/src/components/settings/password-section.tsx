'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
        message: 'A senha deve ter pelo menos nivel "Razoavel"',
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Senha</CardTitle>
            <CardDescription>
              Atualize sua senha de acesso
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha atual</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="Digite sua senha atual"
                        autoComplete="current-password"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {showCurrentPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        </span>
                      </Button>
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
                  <FormLabel>Nova senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Digite a nova senha"
                        autoComplete="new-password"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        tabIndex={-1}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Minimo 8 caracteres. Use letras, numeros e simbolos.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password strength meter */}
            <PasswordStrengthMeter
              password={newPassword}
              userInputs={[userEmail, userName]}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isLoading || !isPasswordStrong}
              >
                {isLoading ? 'Alterando...' : 'Alterar senha'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
