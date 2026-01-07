import { describe, it, expect } from 'vitest';
import { CONFIG_VERSION } from './index';

describe('index exports', () => {
  it('should export CONFIG_VERSION', () => {
    expect(CONFIG_VERSION).toBe('0.1.0');
  });
});
