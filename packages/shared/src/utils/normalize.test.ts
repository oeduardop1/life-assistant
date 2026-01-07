import { describe, it, expect } from 'vitest';
import { normalizeText } from './normalize';

describe('normalizeText', () => {
  it('should convert to lowercase', () => {
    expect(normalizeText('ABC')).toBe('abc');
    expect(normalizeText('Hello World')).toBe('hello world');
  });

  it('should remove accents', () => {
    expect(normalizeText('Decisão')).toBe('decisao');
    expect(normalizeText('café')).toBe('cafe');
    expect(normalizeText('São Paulo')).toBe('sao paulo');
  });

  it('should remove multiple accents', () => {
    expect(normalizeText('Ação')).toBe('acao');
    expect(normalizeText('Coração')).toBe('coracao');
    expect(normalizeText('Ânimo')).toBe('animo');
  });

  it('should trim whitespace', () => {
    expect(normalizeText('  text  ')).toBe('text');
    expect(normalizeText('\thello\n')).toBe('hello');
  });

  it('should handle combined cases', () => {
    expect(normalizeText('  CAFÉ  ')).toBe('cafe');
    expect(normalizeText('  Decisão IMPORTANTE  ')).toBe('decisao importante');
  });

  it('should preserve hyphens', () => {
    expect(normalizeText('Ação-Reação')).toBe('acao-reacao');
    expect(normalizeText('test-case')).toBe('test-case');
  });

  it('should handle empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('should handle numbers', () => {
    expect(normalizeText('123')).toBe('123');
    expect(normalizeText('Test123')).toBe('test123');
  });

  it('should handle special characters', () => {
    expect(normalizeText('test@email')).toBe('test@email');
    expect(normalizeText('hello_world')).toBe('hello_world');
  });
});
