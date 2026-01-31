'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { AuthCard, AuthInput, GradientButton } from '@/components/auth';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const { login, isLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      router.push(redirectTo);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer login';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
        delayChildren: prefersReducedMotion ? 0 : 0.4,
      },
    },
  };

  return (
    <AuthCard>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Bem-vindo de volta
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre para continuar sua jornada
          </p>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div variants={itemVariants}>
            <AuthInput
              id="email"
              type="email"
              label="Email"
              icon={Mail}
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              data-testid="login-email"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Senha</span>
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-chat-accent transition-colors"
                  data-testid="forgot-password-link"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <AuthInput
                id="password"
                type="password"
                label=""
                icon={Lock}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                data-testid="login-password"
                className="mt-0"
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GradientButton
              type="submit"
              isLoading={isSubmitting || isLoading}
              loadingText="Entrando..."
              data-testid="login-submit"
            >
              Entrar
            </GradientButton>
          </motion.div>
        </form>

        {/* Footer */}
        <motion.p
          variants={itemVariants}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          Ainda nao tem uma conta?{' '}
          <Link
            href="/signup"
            className="font-medium text-chat-accent hover:underline"
            data-testid="signup-link"
          >
            Criar conta
          </Link>
        </motion.p>
      </motion.div>
    </AuthCard>
  );
}

function LoginFormSkeleton() {
  return (
    <AuthCard>
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="mx-auto mt-2 h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
