/**
 * Utilitários de formatação
 */

import { format, type Locale } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { SYSTEM_DEFAULTS } from '../constants';

/**
 * Mapa de locales suportados
 */
const localeMap: Record<string, Locale> = {
  'pt-BR': ptBR,
  'en-US': enUS,
};

/**
 * Formata um valor numérico como moeda
 *
 * @param value - Valor a ser formatado
 * @param currency - Código da moeda (default: BRL)
 * @param locale - Locale para formatação (default: pt-BR)
 * @returns String formatada como moeda
 *
 * @example
 * formatCurrency(1234.56) // "R$ 1.234,56"
 * formatCurrency(1234.56, 'USD', 'en-US') // "$1,234.56"
 */
export function formatCurrency(
  value: number,
  currency: string = SYSTEM_DEFAULTS.currency,
  locale: string = SYSTEM_DEFAULTS.locale,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Formatos de data disponíveis
 */
export type DateFormat = 'short' | 'long' | 'full';

/**
 * Padrões de formatação por tipo
 */
const dateFormats: Record<DateFormat, string> = {
  short: 'dd/MM/yyyy',
  long: "dd 'de' MMMM 'de' yyyy",
  full: "EEEE, dd 'de' MMMM 'de' yyyy",
};

/**
 * Formata uma data respeitando timezone e locale
 *
 * @param date - Data a ser formatada (Date ou string ISO)
 * @param timezone - Timezone (default: America/Sao_Paulo)
 * @param locale - Locale para formatação (default: pt-BR)
 * @param formatType - Tipo de formato: short, long, full (default: long)
 * @returns String formatada
 *
 * @example
 * formatDate(new Date('2026-01-06')) // "06 de janeiro de 2026"
 * formatDate(new Date('2026-01-06'), 'America/Sao_Paulo', 'pt-BR', 'short') // "06/01/2026"
 */
export function formatDate(
  date: Date | string,
  timezone: string = SYSTEM_DEFAULTS.timezone,
  locale: string = SYSTEM_DEFAULTS.locale,
  formatType: DateFormat = 'long',
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(dateObj, timezone);
  const dateLocale = localeMap[locale] ?? ptBR;
  return format(zonedDate, dateFormats[formatType], { locale: dateLocale });
}
