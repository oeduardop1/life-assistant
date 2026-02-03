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
 * Life areas (ADR-017: 6 main areas)
 */
export type LifeArea =
  | 'health'
  | 'finance'
  | 'professional'
  | 'learning'
  | 'spiritual'
  | 'relationships';

/**
 * Sub-areas (ADR-017: 17 sub-areas grouped by parent area)
 */
export type SubArea =
  // Health sub-areas
  | 'physical'
  | 'mental'
  | 'leisure'
  // Finance sub-areas
  | 'budget'
  | 'savings'
  | 'debts'
  | 'investments'
  // Professional sub-areas
  | 'career'
  | 'business'
  // Learning sub-areas
  | 'formal'
  | 'informal'
  // Spiritual sub-areas
  | 'practice'
  | 'community'
  // Relationships sub-areas
  | 'family'
  | 'romantic'
  | 'social';

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
  subArea: SubArea | null; // ADR-017
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
  subArea?: SubArea; // ADR-017
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
  subArea?: SubArea; // ADR-017
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
 * ADR-017: 6 main areas
 */
export const lifeAreaLabels: Record<LifeArea, string> = {
  health: 'Saúde',
  finance: 'Finanças',
  professional: 'Profissional',
  learning: 'Aprendizado',
  spiritual: 'Espiritual',
  relationships: 'Relacionamentos',
};

/**
 * Human-readable labels for sub-areas (PT-BR)
 * ADR-017: 17 sub-areas
 */
export const subAreaLabels: Record<SubArea, string> = {
  // Health
  physical: 'Física',
  mental: 'Mental',
  leisure: 'Lazer',
  // Finance
  budget: 'Orçamento',
  savings: 'Poupança',
  debts: 'Dívidas',
  investments: 'Investimentos',
  // Professional
  career: 'Carreira',
  business: 'Negócios',
  // Learning
  formal: 'Formal',
  informal: 'Informal',
  // Spiritual
  practice: 'Prática',
  community: 'Comunidade',
  // Relationships
  family: 'Família',
  romantic: 'Romântico',
  social: 'Social',
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
 * Icons for tracking types (Lucide icon components)
 * Use: const Icon = trackingTypeIcons[type]; <Icon className="h-4 w-4" />
 */
import { Scale, Droplet, Moon, Activity, Smile, Zap, PenLine, type LucideIcon } from 'lucide-react';

export const trackingTypeIcons: Record<TrackingType, LucideIcon> = {
  weight: Scale,
  water: Droplet,
  sleep: Moon,
  exercise: Activity,
  mood: Smile,
  energy: Zap,
  custom: PenLine,
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

// =============================================================================
// Habit Types (M2.1 Unified Tracking)
// =============================================================================

/**
 * Habit frequency options (matches backend habit_frequency enum)
 */
export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';

/**
 * Period of day options (matches backend period_of_day enum)
 */
export type PeriodOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

/**
 * Habit entity from API
 */
export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  icon: string;
  color?: string | null;
  frequency: HabitFrequency;
  frequencyDays?: number[] | null;
  periodOfDay: PeriodOfDay;
  sortOrder: number;
  isActive: boolean;
  longestStreak: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Habit with current streak (from findAll)
 */
export interface HabitWithStreak extends Habit {
  currentStreak: number;
}

/**
 * Habit with completion status for a specific date
 */
export interface HabitWithCompletion {
  habit: HabitWithStreak;
  completed: boolean;
  completedAt?: string;
}

/**
 * Habit completion entity from API
 */
export interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;
  completionDate: string;
  source: string;
  notes?: string | null;
  completedAt: string;
  createdAt: string;
}

/**
 * Habit streak info for streaks tab
 */
export interface HabitStreakInfo {
  habitId: string;
  name: string;
  icon: string;
  color?: string | null;
  currentStreak: number;
  longestStreak: number;
}

// =============================================================================
// Habit Create/Update Types
// =============================================================================

/**
 * Create habit payload
 */
export interface CreateHabitInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  frequency?: HabitFrequency;
  frequencyDays?: number[];
  periodOfDay?: PeriodOfDay;
  sortOrder?: number;
}

/**
 * Update habit payload
 */
export interface UpdateHabitInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  frequency?: HabitFrequency;
  frequencyDays?: number[];
  periodOfDay?: PeriodOfDay;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * Complete habit payload
 */
export interface CompleteHabitInput {
  date?: string;
  notes?: string;
}

// =============================================================================
// Habit API Responses
// =============================================================================

/**
 * API response for single habit
 */
export interface HabitResponse {
  habit: HabitWithStreak;
}

/**
 * API response for habit list
 */
export interface HabitsListResponse {
  habits: HabitWithStreak[];
}

/**
 * API response for habit streaks
 */
export interface HabitStreaksResponse {
  streaks: HabitStreakInfo[];
}

/**
 * API response for habit completion
 */
export interface HabitCompleteResponse {
  completion: HabitCompletion;
  habit: HabitWithStreak;
  message: string;
}

// =============================================================================
// Calendar Types (M2.1 Unified Tracking)
// =============================================================================

/**
 * Calendar day summary from backend
 */
export interface CalendarDaySummary {
  date: string;
  moodScore?: number;
  moodColor: 'green' | 'yellow' | 'red' | 'gray';
  habitsCompleted: number;
  habitsTotal: number;
  hasData: boolean;
}

/**
 * Calendar month response from GET /tracking/calendar/:year/:month
 */
export interface CalendarMonthResponse {
  month: string;
  days: CalendarDaySummary[];
}

/**
 * Day detail response from GET /tracking/day/:date
 */
export interface DayDetailResponse {
  date: string;
  metrics: TrackingEntry[];
  habits: HabitWithCompletion[];
}

// =============================================================================
// Navigation Tabs
// =============================================================================

export type TrackingTab = 'calendar' | 'metrics' | 'insights' | 'streaks' | 'habits';

export interface TrackingTabItem {
  id: TrackingTab;
  label: string;
  href: string;
  icon: string;
}

/**
 * Tracking navigation tabs with icons
 */
export const trackingTabs: TrackingTabItem[] = [
  { id: 'calendar', label: 'Calendário', href: '/tracking', icon: 'Calendar' },
  { id: 'metrics', label: 'Métricas', href: '/tracking/metrics', icon: 'TrendingUp' },
  { id: 'streaks', label: 'Streaks', href: '/tracking/streaks', icon: 'Flame' },
  { id: 'habits', label: 'Hábitos', href: '/tracking/habits', icon: 'ListChecks' },
  { id: 'insights', label: 'Insights', href: '/tracking/insights', icon: 'Lightbulb' },
];

// =============================================================================
// Habit Constants
// =============================================================================

/**
 * Habit frequency labels (Portuguese)
 */
export const habitFrequencyLabels: Record<HabitFrequency, string> = {
  daily: 'Diário',
  weekdays: 'Dias úteis',
  weekends: 'Fins de semana',
  custom: 'Personalizado',
};

/**
 * Period of day labels (Portuguese)
 */
export const periodOfDayLabels: Record<PeriodOfDay, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
  anytime: 'Qualquer hora',
};

/**
 * Mood color mapping based on score
 */
export const moodColorClasses: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-gray-300',
};

/**
 * Mood fill colors for calendar day cells (Year in Pixels style)
 * Uses CSS variables defined in globals.css for theme support
 */
export const moodFillClasses: Record<string, string> = {
  green: 'bg-[var(--tracking-fill-good)]',
  yellow: 'bg-[var(--tracking-fill-neutral)]',
  red: 'bg-[var(--tracking-fill-poor)]',
  gray: 'bg-[var(--tracking-fill-empty)]',
};

/**
 * Day of week labels (Portuguese)
 */
export const dayOfWeekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Full day of week labels (Portuguese)
 */
export const fullDayOfWeekLabels = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

// =============================================================================
// Calendar Helper Functions
// =============================================================================

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Format month for display (e.g., "Janeiro 2026")
 */
export function formatMonthDisplay(monthYear: string): string {
  const [year, month] = monthYear.split('-');
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const monthIndex = parseInt(month ?? '1', 10) - 1;
  return `${months[monthIndex]} ${year}`;
}

/**
 * Get previous month in YYYY-MM format
 */
export function getPreviousMonth(monthYear: string): string {
  const [year, month] = monthYear.split('-').map(Number);
  const date = new Date(year ?? 2026, (month ?? 1) - 2, 1);
  return date.toISOString().slice(0, 7);
}

/**
 * Get next month in YYYY-MM format
 */
export function getNextMonth(monthYear: string): string {
  const [year, month] = monthYear.split('-').map(Number);
  const date = new Date(year ?? 2026, month ?? 1, 1);
  return date.toISOString().slice(0, 7);
}

/**
 * Format date for display (e.g., "Terça, 7 de Janeiro")
 */
export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = fullDayOfWeekLabels[date.getDay()];
  const day = date.getDate();
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const month = months[date.getMonth()];
  return `${dayOfWeek}, ${day} de ${month}`;
}

/**
 * Parse year and month from YYYY-MM string
 */
export function parseMonthYear(monthYear: string): { year: number; month: number } {
  const [year, month] = monthYear.split('-').map(Number);
  return { year: year ?? 2026, month: month ?? 1 };
}

/**
 * Check if a date is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayDate();
}

/**
 * Check if a month is the current month
 */
export function isCurrentMonth(monthYear: string): boolean {
  return monthYear === getCurrentMonth();
}

/**
 * Get mood color based on score
 */
export function getMoodColor(score: number | undefined): 'green' | 'yellow' | 'red' | 'gray' {
  if (score === undefined) return 'gray';
  if (score >= 7) return 'green';
  if (score >= 4) return 'yellow';
  return 'red';
}

/**
 * Get days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Get first day of month (0 = Sunday, 6 = Saturday)
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}
