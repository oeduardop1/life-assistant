// @life-assistant/shared
// Tipos, constantes e utilitarios compartilhados

export const VERSION = '0.1.0';

/**
 * Areas da vida rastreadas pelo sistema
 * Referencia: DATA_MODEL.md
 */
export type LifeArea =
  | 'health'
  | 'financial'
  | 'career'
  | 'relationships'
  | 'spirituality'
  | 'personal_growth'
  | 'mental_health'
  | 'leisure';

/**
 * Lista de todas as areas da vida
 */
export const LIFE_AREAS: readonly LifeArea[] = [
  'health',
  'financial',
  'career',
  'relationships',
  'spirituality',
  'personal_growth',
  'mental_health',
  'leisure',
] as const;
