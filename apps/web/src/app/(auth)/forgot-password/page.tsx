'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const { resetPassword, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await resetPassword(email);
      setEmailSent(true);
      toast.success('Email enviado! Verifique sua caixa de entrada.');
    } catch {
      // Don't reveal if email exists or not for security
      setEmailSent(true);
      toast.success('Se o email existir, voce recebera um link para redefinir sua senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="w-full max-w-md" data-testid="forgot-success">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Email enviado</CardTitle>
          <CardDescription className="text-center">
            Se existe uma conta com o email informado, voce recebera um link para redefinir sua senha.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col space-y-4">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full" data-testid="back-to-login">
              Voltar para login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Esqueci minha senha</CardTitle>
        <CardDescription className="text-center">
          Digite seu email para receber um link de recuperacao
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              data-testid="forgot-email"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isLoading}
            data-testid="forgot-submit"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar email de recuperacao'}
          </Button>
          <Link href="/login" className="text-sm text-center text-muted-foreground hover:text-primary" data-testid="forgot-back-to-login">
            Voltar para login
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
