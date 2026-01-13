import { describe, it, expect } from 'vitest';
import {
  createErrorResult,
  createSuccessResult,
  type ToolExecutionResult,
} from './tool-executor.service.js';
import type { ToolCall } from '../ports/llm.port.js';

describe('tool-executor.service', () => {
  const mockToolCall: ToolCall = {
    id: 'call_123',
    name: 'test_tool',
    arguments: { query: 'test' },
  };

  describe('createErrorResult', () => {
    it('should create error result from Error instance', () => {
      const error = new Error('Something went wrong');
      const result = createErrorResult(mockToolCall, error);

      expect(result).toEqual<ToolExecutionResult>({
        toolCallId: 'call_123',
        toolName: 'test_tool',
        content: '',
        success: false,
        error: 'Something went wrong',
      });
    });

    it('should create error result from string', () => {
      const result = createErrorResult(mockToolCall, 'String error');

      expect(result).toEqual<ToolExecutionResult>({
        toolCallId: 'call_123',
        toolName: 'test_tool',
        content: '',
        success: false,
        error: 'String error',
      });
    });

    it('should create error result from number', () => {
      const result = createErrorResult(mockToolCall, 404);

      expect(result).toEqual<ToolExecutionResult>({
        toolCallId: 'call_123',
        toolName: 'test_tool',
        content: '',
        success: false,
        error: '404',
      });
    });

    it('should create error result from object', () => {
      const result = createErrorResult(mockToolCall, { code: 'ERR_001' });

      expect(result).toEqual<ToolExecutionResult>({
        toolCallId: 'call_123',
        toolName: 'test_tool',
        content: '',
        success: false,
        error: '[object Object]',
      });
    });
  });

  describe('createSuccessResult', () => {
    it('should create success result from string (no stringify)', () => {
      const result = createSuccessResult(mockToolCall, 'Plain text result');

      expect(result).toEqual<ToolExecutionResult>({
        toolCallId: 'call_123',
        toolName: 'test_tool',
        content: 'Plain text result',
        success: true,
      });
    });

    it('should create success result from object (stringify)', () => {
      const result = createSuccessResult(mockToolCall, { data: [1, 2, 3] });

      expect(result).toEqual<ToolExecutionResult>({
        toolCallId: 'call_123',
        toolName: 'test_tool',
        content: '{"data":[1,2,3]}',
        success: true,
      });
    });

    it('should create success result from array (stringify)', () => {
      const result = createSuccessResult(mockToolCall, ['a', 'b', 'c']);

      expect(result).toEqual<ToolExecutionResult>({
        toolCallId: 'call_123',
        toolName: 'test_tool',
        content: '["a","b","c"]',
        success: true,
      });
    });

    it('should create success result from number (stringify)', () => {
      const result = createSuccessResult(mockToolCall, 42);

      expect(result).toEqual<ToolExecutionResult>({
        toolCallId: 'call_123',
        toolName: 'test_tool',
        content: '42',
        success: true,
      });
    });

    it('should create success result from null (stringify)', () => {
      const result = createSuccessResult(mockToolCall, null);

      expect(result).toEqual<ToolExecutionResult>({
        toolCallId: 'call_123',
        toolName: 'test_tool',
        content: 'null',
        success: true,
      });
    });

    it('should create success result from boolean (stringify)', () => {
      const result = createSuccessResult(mockToolCall, true);

      expect(result).toEqual<ToolExecutionResult>({
        toolCallId: 'call_123',
        toolName: 'test_tool',
        content: 'true',
        success: true,
      });
    });
  });

  describe('ToolExecutionResult interface', () => {
    it('should have correct structure for success result', () => {
      const result: ToolExecutionResult = {
        toolCallId: 'call_456',
        toolName: 'search_knowledge',
        content: '{"items":[]}',
        success: true,
      };

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should have correct structure for error result', () => {
      const result: ToolExecutionResult = {
        toolCallId: 'call_789',
        toolName: 'record_metric',
        content: '',
        success: false,
        error: 'Database connection failed',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });
});
