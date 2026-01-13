import { describe, it, expect } from 'vitest';
import { Type } from '@google/genai';
import { z } from 'zod';
import { zodToGeminiSchema, isOptionalSchema } from './zod-to-gemini.js';

describe('zodToGeminiSchema', () => {
  describe('primitive types', () => {
    it('should convert ZodString to STRING type', () => {
      const schema = z.string();
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.STRING);
    });

    it('should convert ZodString with description', () => {
      const schema = z.string().describe('User name');
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.STRING);
      expect(result.description).toBe('User name');
    });

    it('should convert ZodNumber to NUMBER type', () => {
      const schema = z.number();
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.NUMBER);
    });

    it('should convert ZodBoolean to BOOLEAN type', () => {
      const schema = z.boolean();
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.BOOLEAN);
    });
  });

  describe('array types', () => {
    it('should convert ZodArray to ARRAY type with items', () => {
      const schema = z.array(z.string());
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.ARRAY);
      expect(result.items).toEqual({ type: Type.STRING });
    });

    it('should convert nested arrays', () => {
      const schema = z.array(z.array(z.number()));
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.ARRAY);
      expect(result.items?.type).toBe(Type.ARRAY);
      expect(result.items?.items).toEqual({ type: Type.NUMBER });
    });
  });

  describe('enum types', () => {
    it('should convert ZodEnum to STRING with enum values', () => {
      const schema = z.enum(['a', 'b', 'c']);
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.STRING);
      expect(result.enum).toEqual(['a', 'b', 'c']);
    });

    it('should convert ZodNativeEnum to STRING with enum values', () => {
      enum TestEnum {
        A = 'a',
        B = 'b',
      }
      const schema = z.nativeEnum(TestEnum);
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.STRING);
      expect(result.enum).toEqual(['a', 'b']);
    });
  });

  describe('object types', () => {
    it('should convert ZodObject with required fields', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.OBJECT);
      expect(result.properties).toEqual({
        name: { type: Type.STRING },
        age: { type: Type.NUMBER },
      });
      expect(result.required).toEqual(['name', 'age']);
    });

    it('should handle optional fields correctly', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().optional(),
      });
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.OBJECT);
      expect(result.required).toEqual(['name']);
    });

    it('should handle fields with defaults as not required', () => {
      const schema = z.object({
        name: z.string(),
        limit: z.number().default(10),
      });
      const result = zodToGeminiSchema(schema);

      expect(result.required).toEqual(['name']);
    });

    it('should handle nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
        }),
      });
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.OBJECT);
      expect(result.properties?.user?.type).toBe(Type.OBJECT);
      expect(result.properties?.user?.properties?.name).toEqual({ type: Type.STRING });
    });
  });

  describe('wrapped types', () => {
    it('should handle ZodOptional correctly', () => {
      const schema = z.string().optional();
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.STRING);
    });

    it('should handle ZodDefault correctly', () => {
      const schema = z.number().default(10);
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.NUMBER);
    });

    it('should handle ZodNullable correctly', () => {
      const schema = z.string().nullable();
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.STRING);
    });
  });

  describe('literal types', () => {
    it('should convert string literal to STRING with enum', () => {
      const schema = z.literal('test');
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.STRING);
      expect(result.enum).toEqual(['test']);
    });

    it('should convert number literal to NUMBER', () => {
      const schema = z.literal(42);
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.NUMBER);
    });

    it('should convert boolean literal to BOOLEAN', () => {
      const schema = z.literal(true);
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.BOOLEAN);
    });
  });

  describe('complex schemas', () => {
    it('should handle real-world tool schema', () => {
      const schema = z.object({
        query: z.string().describe('Search query'),
        type: z.enum(['fact', 'preference', 'memory']).optional(),
        limit: z.number().max(10).default(5),
      });
      const result = zodToGeminiSchema(schema);

      expect(result.type).toBe(Type.OBJECT);
      expect(result.properties?.query?.type).toBe(Type.STRING);
      expect(result.properties?.query?.description).toBe('Search query');
      expect(result.properties?.type?.enum).toEqual(['fact', 'preference', 'memory']);
      expect(result.required).toEqual(['query']);
    });
  });
});

describe('isOptionalSchema', () => {
  it('should return true for optional schemas', () => {
    expect(isOptionalSchema(z.string().optional())).toBe(true);
  });

  it('should return true for default schemas', () => {
    expect(isOptionalSchema(z.number().default(10))).toBe(true);
  });

  it('should return true for nullable schemas', () => {
    expect(isOptionalSchema(z.string().nullable())).toBe(true);
  });

  it('should return false for required schemas', () => {
    expect(isOptionalSchema(z.string())).toBe(false);
    expect(isOptionalSchema(z.number())).toBe(false);
  });
});
