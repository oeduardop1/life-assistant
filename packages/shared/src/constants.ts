/**
 * Constantes do sistema - docs/specs/system.md
 */

import { LifeArea, SubArea } from './enums';

/**
 * Pesos default das 6 áreas de vida - docs/specs/system.md §2.2 (ADR-017)
 */
export const DEFAULT_WEIGHTS: Record<LifeArea, number> = {
  [LifeArea.HEALTH]: 1.0,
  [LifeArea.FINANCE]: 1.0,
  [LifeArea.PROFESSIONAL]: 1.0,
  [LifeArea.LEARNING]: 0.8,
  [LifeArea.SPIRITUAL]: 0.5,
  [LifeArea.RELATIONSHIPS]: 1.0,
};

/**
 * Pesos internos das sub-áreas (não configuráveis pelo usuário) - ADR-017
 */
export const SUB_AREA_WEIGHTS: Record<SubArea, number> = {
  // health
  [SubArea.PHYSICAL]: 0.50,
  [SubArea.MENTAL]: 0.35,
  [SubArea.LEISURE]: 0.15,
  // finance
  [SubArea.BUDGET]: 0.30,
  [SubArea.SAVINGS]: 0.25,
  [SubArea.DEBTS]: 0.25,
  [SubArea.INVESTMENTS]: 0.20,
  // professional
  [SubArea.CAREER]: 0.60,
  [SubArea.BUSINESS]: 0.40,
  // learning
  [SubArea.FORMAL]: 0.50,
  [SubArea.INFORMAL]: 0.50,
  // spiritual
  [SubArea.PRACTICE]: 0.70,
  [SubArea.COMMUNITY]: 0.30,
  // relationships
  [SubArea.FAMILY]: 0.40,
  [SubArea.ROMANTIC]: 0.35,
  [SubArea.SOCIAL]: 0.25,
};

/**
 * Configuração de limites para pesos
 */
export const WEIGHT_CONFIG = {
  MIN: 0.0,
  MAX: 2.0,
} as const;

/**
 * Validações de tracking - docs/specs/system.md §3.3
 */
export const TRACKING_VALIDATIONS = {
  weight: {
    min: 0,
    max: 500,
    unit: 'kg',
  },
  water: {
    min: 0,
    max: 10000,
    unit: 'ml',
  },
  sleep: {
    min: 0,
    max: 24,
    qualityMin: 1,
    qualityMax: 10,
  },
  exercise: {
    minDuration: 0,
    maxDuration: 1440,
  },
  mood: {
    min: 1,
    max: 10,
  },
  energy: {
    min: 1,
    max: 10,
  },
} as const;

/**
 * Defaults de tracking
 */
export const TRACKING_DEFAULTS = {
  waterGoal: 2000,
  sleepGoal: 8,
  exerciseGoalWeekly: 150,
} as const;

/**
 * Rate limits por plano - docs/specs/system.md §2.6
 */
export const RATE_LIMITS = {
  free: {
    messagesPerMinute: 5,
    messagesPerHour: 30,
    messagesPerDay: 20,
  },
  pro: {
    messagesPerMinute: 10,
    messagesPerHour: 100,
    messagesPerDay: 100,
  },
  premium: {
    messagesPerMinute: 20,
    messagesPerHour: null,
    messagesPerDay: null,
  },
} as const;

/**
 * Storage limits por plano - docs/specs/system.md §2.7
 */
export const STORAGE_LIMITS = {
  free: {
    messagesPerDay: 20,
    trackingEntriesPerMonth: 100,
    notes: 50,
    people: 20,
    storageBytes: 100 * 1024 * 1024, // 100MB
    conversationHistoryDays: 30,
  },
  pro: {
    messagesPerDay: 100,
    trackingEntriesPerMonth: 1000,
    notes: 500,
    people: 200,
    storageBytes: 1024 * 1024 * 1024, // 1GB
    conversationHistoryDays: 365,
  },
  premium: {
    messagesPerDay: null,
    trackingEntriesPerMonth: null,
    notes: null,
    people: null,
    storageBytes: 10 * 1024 * 1024 * 1024, // 10GB
    conversationHistoryDays: null,
  },
} as const;

/**
 * Defaults do sistema - docs/specs/system.md §2.1
 */
export const SYSTEM_DEFAULTS = {
  timezone: 'America/Sao_Paulo',
  locale: 'pt-BR',
  currency: 'BRL',
} as const;

/**
 * Retenção de dados - docs/specs/system.md §2.5
 */
export const DATA_RETENTION_DAYS = {
  softDeleteToHardDelete: 30,
  conversation: 90,
} as const;
