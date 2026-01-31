'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AriaAvatarLarge } from './aria-avatar-large';
import { FeatureList } from './feature-list';

interface BrandingPanelProps {
  showFeatures?: boolean;
  className?: string;
}

/**
 * BrandingPanel - Left-side branding for auth pages
 *
 * Displays Aria avatar, app name, tagline, and optionally feature list.
 * Animated entrance with staggered children.
 */
export function BrandingPanel({ showFeatures = false, className }: BrandingPanelProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <motion.div
      className={`flex flex-col items-center text-center ${className ?? ''}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Aria Avatar */}
      <motion.div variants={itemVariants}>
        <AriaAvatarLarge />
      </motion.div>

      {/* App Name */}
      <motion.h1
        variants={itemVariants}
        className="mt-8 text-3xl font-bold tracking-tight md:text-4xl"
      >
        Life Assistant
        <span className="ml-2 text-chat-accent">AI</span>
      </motion.h1>

      {/* Tagline */}
      <motion.p
        variants={itemVariants}
        className="mt-3 max-w-xs text-base text-muted-foreground"
      >
        Sua memoria, conselheira e assistente pessoal
      </motion.p>

      {/* Features (signup only) */}
      {showFeatures && (
        <motion.div variants={itemVariants} className="mt-10 w-full max-w-xs">
          <FeatureList />
        </motion.div>
      )}
    </motion.div>
  );
}
