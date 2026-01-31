'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { AuthCard, AuthInput, GradientButton, PasswordStrength } from '@/components/auth';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas nao coincidem');
      return;
    }

    if (password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(email, password, name);
      toast.success('Conta criada! Verifique seu email para confirmar.');
      router.push('/verify-email');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar conta';
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
            Criar conta
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Junte-se a milhares de pessoas organizando suas vidas
          </p>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div variants={itemVariants}>
            <AuthInput
              id="name"
              type="text"
              label="Nome"
              icon={User}
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              data-testid="signup-name"
            />
          </motion.div>

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
              data-testid="signup-email"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <AuthInput
              id="password"
              type="password"
              label="Senha"
              icon={Lock}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              data-testid="signup-password"
            />
            <PasswordStrength password={password} className="mt-2" />
          </motion.div>

          <motion.div variants={itemVariants}>
            <AuthInput
              id="confirmPassword"
              type="password"
              label="Confirmar senha"
              icon={Lock}
              placeholder="********"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              data-testid="signup-confirm-password"
              error={
                confirmPassword && password !== confirmPassword
                  ? 'As senhas nao coincidem'
                  : undefined
              }
            />
          </motion.div>

          <motion.div variants={itemVariants} className="pt-2">
            <GradientButton
              type="submit"
              isLoading={isSubmitting || isLoading}
              loadingText="Criando conta..."
              data-testid="signup-submit"
            >
              Criar conta
            </GradientButton>
          </motion.div>
        </form>

        {/* Footer */}
        <motion.p
          variants={itemVariants}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          Ja tem uma conta?{' '}
          <Link
            href="/login"
            className="font-medium text-chat-accent hover:underline"
            data-testid="login-link"
          >
            Entrar
          </Link>
        </motion.p>
      </motion.div>
    </AuthCard>
  );
}
