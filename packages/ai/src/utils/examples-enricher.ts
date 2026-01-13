/**
 * Enriches tool descriptions with input examples.
 * Workaround for providers that don't support native inputExamples (e.g., Gemini).
 * @module utils/examples-enricher
 */

/**
 * Enriches a tool description with input examples.
 *
 * This is a workaround for LLM providers that don't support native
 * input_examples in their tool definitions (like Gemini). The examples
 * are formatted and appended to the description.
 *
 * Research shows that providing examples improves tool call accuracy
 * from ~72% to ~90% (per Anthropic "Advanced Tool Use" documentation).
 *
 * @param description - Original tool description
 * @param examples - Array of input examples (2-4 recommended)
 * @returns Enriched description with examples appended
 *
 * @example
 * ```typescript
 * const enriched = enrichDescriptionWithExamples(
 *   'Records a metric for the user.',
 *   [
 *     { type: 'weight', value: 82.5, unit: 'kg' },
 *     { type: 'expense', value: 150, category: 'food' },
 *   ]
 * );
 * // Returns:
 * // "Records a metric for the user.
 * //
 * // Input examples:
 * // Example 1: {"type":"weight","value":82.5,"unit":"kg"}
 * // Example 2: {"type":"expense","value":150,"category":"food"}"
 * ```
 */
export function enrichDescriptionWithExamples(
  description: string,
  examples?: Record<string, unknown>[],
): string {
  if (!examples || examples.length === 0) {
    return description;
  }

  const examplesText = examples
    .map((example, index) => `Example ${String(index + 1)}: ${JSON.stringify(example)}`)
    .join('\n');

  return `${description}\n\nInput examples:\n${examplesText}`;
}

/**
 * Formats examples in a more readable way for complex objects.
 *
 * @param examples - Array of input examples
 * @returns Formatted examples string
 */
export function formatExamplesReadable(
  examples: Record<string, unknown>[],
): string {
  if (examples.length === 0) {
    return '';
  }

  return examples
    .map((example, index) => {
      const entries = Object.entries(example)
        .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
        .join('\n');
      return `Example ${String(index + 1)}:\n${entries}`;
    })
    .join('\n\n');
}

/**
 * Validates that examples match the expected structure.
 *
 * @param examples - Array of input examples
 * @param requiredFields - Fields that must be present in each example
 * @returns Array of validation errors, empty if valid
 */
export function validateExamples(
  examples: Record<string, unknown>[],
  requiredFields: string[],
): string[] {
  const errors: string[] = [];

  if (examples.length < 2) {
    errors.push('At least 2 examples are recommended');
  }

  if (examples.length > 4) {
    errors.push('At most 4 examples are recommended');
  }

  examples.forEach((example, index) => {
    requiredFields.forEach((field) => {
      if (!(field in example)) {
        errors.push(`Example ${String(index + 1)} is missing required field: ${field}`);
      }
    });
  });

  return errors;
}
