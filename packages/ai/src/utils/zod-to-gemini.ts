/**
 * Converts Zod schemas to Gemini API compatible type definitions.
 * Required because Gemini uses its own Type enum instead of JSON Schema.
 * @module utils/zod-to-gemini
 */

import { Type } from '@google/genai';
import { z } from 'zod';

/**
 * Gemini-compatible schema definition.
 */
export interface GeminiSchema {
  /** The type of the schema */
  type: Type;
  /** Description of the field */
  description?: string;
  /** Properties for object types */
  properties?: Record<string, GeminiSchema>;
  /** Schema for array items */
  items?: GeminiSchema;
  /** Required field names for object types */
  required?: string[];
  /** Allowed values for enum types */
  enum?: string[];
  /** Format hint (e.g., 'date', 'date-time') */
  format?: string;
}

/**
 * Converts a Zod schema to Gemini API compatible schema.
 *
 * Supports: ZodString, ZodNumber, ZodBoolean, ZodArray, ZodObject,
 * ZodEnum, ZodNativeEnum, ZodOptional, ZodDefault, ZodNullable.
 *
 * @param schema - Zod schema to convert
 * @returns Gemini-compatible schema definition
 *
 * @example
 * ```typescript
 * const zodSchema = z.object({
 *   name: z.string().describe('User name'),
 *   age: z.number().optional(),
 * });
 *
 * const geminiSchema = zodToGeminiSchema(zodSchema);
 * // { type: Type.OBJECT, properties: {...}, required: ['name'] }
 * ```
 */
export function zodToGeminiSchema(schema: z.ZodType): GeminiSchema {
  // Handle wrapped types first
  // Note: Zod's unwrap/removeDefault methods return any, but are type-safe at runtime
  if (schema instanceof z.ZodOptional) {
    return zodToGeminiSchema(schema.unwrap() as z.ZodType);
  }

  if (schema instanceof z.ZodDefault) {
    return zodToGeminiSchema(schema.removeDefault() as z.ZodType);
  }

  if (schema instanceof z.ZodNullable) {
    return zodToGeminiSchema(schema.unwrap() as z.ZodType);
  }

  // String type
  if (schema instanceof z.ZodString) {
    const result: GeminiSchema = {
      type: Type.STRING,
    };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }

  // Number type (includes integer)
  if (schema instanceof z.ZodNumber) {
    const result: GeminiSchema = {
      type: Type.NUMBER,
    };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }

  // Boolean type
  if (schema instanceof z.ZodBoolean) {
    const result: GeminiSchema = {
      type: Type.BOOLEAN,
    };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }

  // Array type
  if (schema instanceof z.ZodArray) {
    const result: GeminiSchema = {
      type: Type.ARRAY,
      items: zodToGeminiSchema(schema.element as z.ZodType),
    };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }

  // Enum type (string enum)
  if (schema instanceof z.ZodEnum) {
    const result: GeminiSchema = {
      type: Type.STRING,
      enum: schema.options as string[],
    };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }

  // Native enum type
  if (schema instanceof z.ZodNativeEnum) {
    const enumValues = Object.values(schema.enum as Record<string, unknown>).filter(
      (v): v is string => typeof v === 'string',
    );
    const result: GeminiSchema = {
      type: Type.STRING,
      enum: enumValues,
    };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }

  // Object type
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const properties: Record<string, GeminiSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToGeminiSchema(value);

      // Check if field is required (not optional, nullable, or has default)
      if (
        !(value instanceof z.ZodOptional) &&
        !(value instanceof z.ZodDefault) &&
        !(value instanceof z.ZodNullable)
      ) {
        required.push(key);
      }
    }

    const result: GeminiSchema = {
      type: Type.OBJECT,
      properties,
    };

    if (required.length > 0) {
      result.required = required;
    }

    if (schema.description) {
      result.description = schema.description;
    }

    return result;
  }

  // Literal type (treat as enum with single value)
  if (schema instanceof z.ZodLiteral) {
    const value: unknown = schema.value;
    if (typeof value === 'string') {
      return {
        type: Type.STRING,
        enum: [value],
      };
    }
    if (typeof value === 'number') {
      return {
        type: Type.NUMBER,
      };
    }
    if (typeof value === 'boolean') {
      return {
        type: Type.BOOLEAN,
      };
    }
  }

  // Union type (simplified - uses first option)
  if (schema instanceof z.ZodUnion) {
    const options = schema.options as z.ZodType[];
    const firstOption = options[0];
    if (firstOption) {
      return zodToGeminiSchema(firstOption);
    }
  }

  // Record type
  if (schema instanceof z.ZodRecord) {
    const result: GeminiSchema = {
      type: Type.OBJECT,
    };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  }

  // Fallback to string for unsupported types
  console.warn(`Unsupported Zod type: ${schema.constructor.name}, falling back to STRING`);
  return { type: Type.STRING };
}

/**
 * Type guard to check if a schema is optional.
 */
export function isOptionalSchema(schema: z.ZodType): boolean {
  return (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodNullable
  );
}
