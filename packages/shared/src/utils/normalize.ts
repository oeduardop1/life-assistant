/**
 * Normaliza texto para busca case/accent insensitive (wikilinks)
 * Per SYSTEM_SPECS.md §3.6
 *
 * @param text - Texto a ser normalizado
 * @returns Texto normalizado (lowercase, sem acentos, trimmed)
 *
 * @example
 * normalizeText("Decisão") // "decisao"
 * normalizeText("  CAFÉ  ") // "cafe"
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
