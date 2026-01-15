/**
 * @life-assistant/shared
 * Tipos, constantes e utilitários compartilhados
 */

export const VERSION = '0.1.0';

// Enums
export {
  UserStatus,
  LifeArea,
  TrackingType,
  ConversationType,
  VaultItemType,
  VaultCategory,
  ExpenseCategory,
  ALL_USER_STATUSES,
  ALL_LIFE_AREAS,
  ALL_TRACKING_TYPES,
  ALL_CONVERSATION_TYPES,
  ALL_VAULT_ITEM_TYPES,
  ALL_VAULT_CATEGORIES,
  ALL_EXPENSE_CATEGORIES,
} from './enums';

// Constants
export {
  DEFAULT_WEIGHTS,
  WEIGHT_CONFIG,
  TRACKING_VALIDATIONS,
  TRACKING_DEFAULTS,
  RATE_LIMITS,
  STORAGE_LIMITS,
  SYSTEM_DEFAULTS,
  DATA_RETENTION_DAYS,
} from './constants';

// Utils
export {
  formatCurrency,
  formatDate,
  normalizeText,
  sleep,
  retry,
  type DateFormat,
  type RetryOptions,
} from './utils';
