import { describe, it, expect } from 'vitest';
import {
  enrichDescriptionWithExamples,
  formatExamplesReadable,
  validateExamples,
} from './examples-enricher.js';

describe('enrichDescriptionWithExamples', () => {
  it('should return original description when no examples provided', () => {
    const description = 'This is a tool.';
    const result = enrichDescriptionWithExamples(description, undefined);

    expect(result).toBe(description);
  });

  it('should return original description when examples array is empty', () => {
    const description = 'This is a tool.';
    const result = enrichDescriptionWithExamples(description, []);

    expect(result).toBe(description);
  });

  it('should append examples to description', () => {
    const description = 'Records a metric for the user.';
    const examples = [
      { type: 'weight', value: 82.5, unit: 'kg' },
      { type: 'expense', value: 150, category: 'food' },
    ];
    const result = enrichDescriptionWithExamples(description, examples);

    expect(result).toContain('Records a metric for the user.');
    expect(result).toContain('Input examples:');
    expect(result).toContain('Example 1:');
    expect(result).toContain('"type":"weight"');
    expect(result).toContain('Example 2:');
    expect(result).toContain('"type":"expense"');
  });

  it('should handle single example', () => {
    const description = 'Test tool.';
    const examples = [{ query: 'test' }];
    const result = enrichDescriptionWithExamples(description, examples);

    expect(result).toContain('Example 1:');
    expect(result).not.toContain('Example 2:');
  });

  it('should handle multiple examples', () => {
    const description = 'Test tool.';
    const examples = [
      { query: 'test1' },
      { query: 'test2' },
      { query: 'test3' },
      { query: 'test4' },
    ];
    const result = enrichDescriptionWithExamples(description, examples);

    expect(result).toContain('Example 1:');
    expect(result).toContain('Example 2:');
    expect(result).toContain('Example 3:');
    expect(result).toContain('Example 4:');
  });
});

describe('formatExamplesReadable', () => {
  it('should return empty string for empty array', () => {
    const result = formatExamplesReadable([]);

    expect(result).toBe('');
  });

  it('should format examples in readable way', () => {
    const examples = [
      { type: 'weight', value: 82.5 },
      { type: 'expense', value: 150 },
    ];
    const result = formatExamplesReadable(examples);

    expect(result).toContain('Example 1:');
    expect(result).toContain('type: "weight"');
    expect(result).toContain('value: 82.5');
    expect(result).toContain('Example 2:');
    expect(result).toContain('type: "expense"');
  });
});

describe('validateExamples', () => {
  it('should return error for less than 2 examples', () => {
    const examples = [{ query: 'test' }];
    const errors = validateExamples(examples, ['query']);

    expect(errors).toContain('At least 2 examples are recommended');
  });

  it('should return error for more than 4 examples', () => {
    const examples = [
      { query: 'test1' },
      { query: 'test2' },
      { query: 'test3' },
      { query: 'test4' },
      { query: 'test5' },
    ];
    const errors = validateExamples(examples, ['query']);

    expect(errors).toContain('At most 4 examples are recommended');
  });

  it('should return error for missing required fields', () => {
    const examples = [
      { query: 'test1' },
      { name: 'test2' }, // missing 'query'
    ];
    const errors = validateExamples(examples, ['query']);

    expect(errors).toContain('Example 2 is missing required field: query');
  });

  it('should return empty array for valid examples', () => {
    const examples = [
      { query: 'test1', type: 'fact' },
      { query: 'test2', type: 'preference' },
    ];
    const errors = validateExamples(examples, ['query']);

    expect(errors).toHaveLength(0);
  });
});
