'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { User } from 'lucide-react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

  const form = useForm<UpdateProfileData>({
    resolver: standardSchemaResolver(updateProfileSchema),
    defaultValues: {
      name: defaultName,
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const result = await onSubmit(data);
      if (result.success) {
        toast.success('Perfil atualizado com sucesso');
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Perfil</CardTitle>
            <CardDescription>
              Gerencie suas informacoes pessoais
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Seu nome"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || !isDirty}>
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
