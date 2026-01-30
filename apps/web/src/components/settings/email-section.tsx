'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Mail, Eye, EyeOff } from 'lucide-react';
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
        toast.success(result.message || 'Email de verificacao enviado');
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Email</CardTitle>
            <CardDescription>
              Altere seu endereco de email
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current email display */}
            <div className="rounded-lg border bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">Email atual</p>
              <p className="text-sm font-medium">{currentEmail}</p>
            </div>

            <FormField
              control={form.control}
              name="newEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novo email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="novo@email.com"
                      autoComplete="email"
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
                  <FormLabel>Senha atual</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
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
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Necessaria para confirmar a alteracao
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Alterar email'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
