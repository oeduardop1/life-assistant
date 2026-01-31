'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Brain, Target, Sparkles, type LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  text: string;
}

const features: Feature[] = [
  { icon: Brain, text: 'Organize sua vida com inteligencia' },
  { icon: Target, text: 'Tome decisoes melhores' },
  { icon: Sparkles, text: 'Construa habitos saudaveis' },
];

interface FeatureListProps {
  className?: string;
}

/**
 * FeatureList - Animated list of product features
 *
 * Shows key benefits with icons and staggered entrance animation.
 * Used on the signup page branding panel.
 */
export function FeatureList({ className }: FeatureListProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.5,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.ul
      className={`space-y-3 ${className ?? ''}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {features.map((feature, index) => (
        <motion.li
          key={index}
          variants={itemVariants}
          className="flex items-center gap-3 text-sm text-muted-foreground"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chat-accent/10">
            <feature.icon className="h-4 w-4 text-chat-accent" />
          </div>
          <span>{feature.text}</span>
        </motion.li>
      ))}
    </motion.ul>
  );
}
