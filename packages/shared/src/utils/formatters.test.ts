import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate } from './formatters';

describe('formatCurrency', () => {
  it('should format BRL by default', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('R$');
    expect(result).toContain('1.234,56');
  });

  it('should format USD with en-US locale', () => {
    const result = formatCurrency(1234.56, 'USD', 'en-US');
    expect(result).toContain('$');
    expect(result).toContain('1,234.56');
  });

  it('should handle negative values', () => {
    const result = formatCurrency(-100);
    expect(result).toContain('R$');
    expect(result).toContain('100,00');
    expect(result).toMatch(/-/);
  });

  it('should format zero correctly', () => {
    const result = formatCurrency(0);
    expect(result).toContain('R$');
    expect(result).toContain('0,00');
  });

  it('should handle large numbers', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('R$');
    expect(result).toContain('1.000.000,00');
  });

  it('should handle small decimal values', () => {
    const result = formatCurrency(0.01);
    expect(result).toContain('R$');
    expect(result).toContain('0,01');
  });
});

describe('formatDate', () => {
  const testDate = new Date('2026-01-06T12:00:00Z');

  it('should use pt-BR locale by default with long format', () => {
    const result = formatDate(testDate);
    expect(result).toContain('de');
    expect(result).toContain('janeiro');
    expect(result).toContain('2026');
  });

  it('should format with short format', () => {
    const result = formatDate(testDate, 'America/Sao_Paulo', 'pt-BR', 'short');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('should format with full format', () => {
    const result = formatDate(testDate, 'America/Sao_Paulo', 'pt-BR', 'full');
    expect(result).toContain('2026');
    expect(result).toContain('de');
    // Should include day of week
    expect(result).toMatch(/[a-zç-]+,/i);
  });

  it('should accept string input', () => {
    const result = formatDate('2026-01-06');
    expect(result).toContain('2026');
    expect(result).toContain('janeiro');
  });

  it('should handle different timezone', () => {
    // Create a date at midnight UTC
    const utcDate = new Date('2026-01-06T00:00:00Z');

    // In New York (UTC-5), this should still be Jan 5
    const nyResult = formatDate(utcDate, 'America/New_York', 'pt-BR', 'short');
    // In Sao Paulo (UTC-3), this should be Jan 5 at 21:00
    const spResult = formatDate(utcDate, 'America/Sao_Paulo', 'pt-BR', 'short');

    // Both should produce valid date strings
    expect(nyResult).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(spResult).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('should format with en-US locale', () => {
    const result = formatDate(testDate, 'America/New_York', 'en-US', 'long');
    expect(result).toContain('January');
    expect(result).toContain('2026');
  });

  it('should fallback to ptBR for unknown locale', () => {
    const result = formatDate(testDate, 'America/Sao_Paulo', 'unknown-locale');
    // Should still produce a valid result using ptBR fallback
    expect(result).toContain('2026');
  });
});
