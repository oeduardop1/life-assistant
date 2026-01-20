/**
 * Tracking Module Types
 *
 * Types for tracking metrics (weight, water, sleep, exercise, mood, energy, custom).
 * @see docs/milestones/phase-2-tracker.md M2.1 for Tracking implementation
 * @see ADR-015 for Low Friction Tracking Philosophy
 */

// =============================================================================
// Enums / Unions
// =============================================================================

/**
 * Tracking types for M2.1
 * @see docs/specs/system.md §3.3 for validation rules
 */
export type TrackingType =
  | 'weight'
  | 'water'
  | 'sleep'
  | 'exercise'
  | 'mood'
  | 'energy'
  | 'custom';

/**
 * Life areas (same as memory module)
 */
export type LifeArea =
  | 'health'
  | 'financial'
  | 'relationships'
  | 'career'
  | 'personal_growth'
  | 'leisure'
  | 'spirituality'
  | 'mental_health';

/**
 * Source of tracking entry
 */
export type TrackingSource = 'form' | 'chat' | 'api' | 'telegram';

// =============================================================================
// Entities
// =============================================================================

export interface TrackingEntry {
  id: string;
  type: TrackingType;
  area: LifeArea;
  value: string; // Stored as string for precision
  unit: string;
  entryDate: string; // YYYY-MM-DD
  entryTime: string | null; // ISO timestamp
  source: TrackingSource;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Aggregations
// =============================================================================

export interface TrackingAggregation {
  type: TrackingType | string;
  average: number | null;
  sum: number | null;
  min: number | null;
  max: number | null;
  count: number;
  latestValue: number | null;
  previousValue: number | null;
  variation: number | null; // percentage change
}

// =============================================================================
// Statistics
// =============================================================================

export interface TrackingStats {
  byType: Record<string, number>;
  total: number;
}

// =============================================================================
// API Responses
// =============================================================================

export interface TrackingEntryListResponse {
  entries: TrackingEntry[];
  total: number;
  hasMore: boolean;
}

export interface TrackingEntryResponse {
  entry: TrackingEntry;
}

export interface TrackingAggregationResponse {
  aggregation: TrackingAggregation;
}

export interface TrackingStatsResponse {
  stats: TrackingStats;
}

// =============================================================================
// Filter & Query Params
// =============================================================================

export interface ListTrackingFilters {
  type?: TrackingType;
  area?: LifeArea;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface GetAggregationsParams {
  type: TrackingType;
  startDate?: string;
  endDate?: string;
}

// =============================================================================
// DTOs for mutations
// =============================================================================

export interface CreateTrackingEntryInput {
  type: TrackingType;
  area: LifeArea;
  value: number;
  unit?: string;
  entryDate: string; // YYYY-MM-DD
  entryTime?: string; // ISO timestamp
  source?: TrackingSource;
  metadata?: Record<string, unknown>;
}

export interface UpdateTrackingEntryInput {
  value?: number;
  unit?: string;
  entryDate?: string;
  entryTime?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Human-readable labels for tracking types (PT-BR)
 */
export const trackingTypeLabels: Record<TrackingType, string> = {
  weight: 'Peso',
  water: 'Água',
  sleep: 'Sono',
  exercise: 'Exercício',
  mood: 'Humor',
  energy: 'Energia',
  custom: 'Personalizado',
};

/**
 * Human-readable labels for life areas (PT-BR)
 */
export const lifeAreaLabels: Record<LifeArea, string> = {
  health: 'Saúde',
  financial: 'Financeiro',
  relationships: 'Relacionamentos',
  career: 'Carreira',
  personal_growth: 'Crescimento Pessoal',
  leisure: 'Lazer',
  spirituality: 'Espiritualidade',
  mental_health: 'Saúde Mental',
};

/**
 * Human-readable labels for sources (PT-BR)
 */
export const sourceLabels: Record<TrackingSource, string> = {
  form: 'Formulário',
  chat: 'Conversa',
  api: 'API',
  telegram: 'Telegram',
};

/**
 * Default units by tracking type
 */
export const defaultUnits: Record<TrackingType, string> = {
  weight: 'kg',
  water: 'ml',
  sleep: 'horas',
  exercise: 'min',
  mood: 'pontos',
  energy: 'pontos',
  custom: 'unidades',
};

/**
 * Validation rules by tracking type
 * @see docs/specs/system.md §3.3
 */
export const validationRules: Record<TrackingType, { min?: number; max?: number; step?: number }> = {
  weight: { min: 0.1, max: 500, step: 0.1 },
  water: { min: 1, max: 10000, step: 1 },
  sleep: { min: 0.1, max: 24, step: 0.5 },
  exercise: { min: 1, max: 1440, step: 1 },
  mood: { min: 1, max: 10, step: 1 },
  energy: { min: 1, max: 10, step: 1 },
  custom: {},
};

/**
 * Icons for tracking types (Lucide icon names)
 */
export const trackingTypeIcons: Record<TrackingType, string> = {
  weight: 'Scale',
  water: 'Droplet',
  sleep: 'Moon',
  exercise: 'Activity',
  mood: 'Smile',
  energy: 'Zap',
  custom: 'PenLine',
};

/**
 * Colors for tracking types (Tailwind classes)
 */
export const trackingTypeColors: Record<TrackingType, string> = {
  weight: 'text-blue-500',
  water: 'text-cyan-500',
  sleep: 'text-indigo-500',
  exercise: 'text-green-500',
  mood: 'text-yellow-500',
  energy: 'text-orange-500',
  custom: 'text-gray-500',
};

/**
 * Parse numeric value from string
 */
export function parseTrackingValue(value: string): number {
  return parseFloat(value);
}

/**
 * Format tracking value for display
 */
export function formatTrackingValue(value: string | number, unit: string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Format based on type of value
  if (unit === 'kg') {
    return `${numValue.toFixed(1)} ${unit}`;
  }
  if (unit === 'ml') {
    return `${numValue.toLocaleString('pt-BR')} ${unit}`;
  }
  if (unit === 'horas' || unit === 'hours') {
    return `${numValue.toFixed(1)}h`;
  }
  if (unit === 'min') {
    return `${numValue} ${unit}`;
  }
  if (unit === 'pontos' || unit === 'score') {
    return `${numValue}/10`;
  }

  return `${numValue} ${unit}`;
}

/**
 * Format variation percentage
 */
export function formatVariation(variation: number | null): string {
  if (variation === null) return '-';
  const sign = variation >= 0 ? '+' : '';
  return `${sign}${variation.toFixed(1)}%`;
}

/**
 * Get color class for variation
 */
export function getVariationColor(variation: number | null, type: TrackingType): string {
  if (variation === null) return 'text-gray-500';

  // For weight, negative is usually good
  if (type === 'weight') {
    return variation < 0 ? 'text-green-500' : variation > 0 ? 'text-red-500' : 'text-gray-500';
  }

  // For most metrics, positive is good
  return variation > 0 ? 'text-green-500' : variation < 0 ? 'text-red-500' : 'text-gray-500';
}
