import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppLoggerService } from '../../../src/logger/logger.service.js';
import { AppConfigService } from '../../../src/config/config.service.js';

describe('AppLoggerService', () => {
  let logger: AppLoggerService;
  let mockConfig: Partial<AppConfigService>;
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    mockConfig = {
      logLevel: 'debug',
      isProduction: false,
    };

    logger = new AppLoggerService(mockConfig as AppConfigService);

    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setContext', () => {
    it('should_set_context_and_return_this', () => {
      const result = logger.setContext('TestContext');

      expect(result).toBe(logger);
    });

    it('should_include_context_in_logs', () => {
      logger.setContext('TestContext');
      logger.log('Test message');

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.context).toBe('TestContext');
    });
  });

  describe('log levels', () => {
    it('should_log_info_level', () => {
      logger.log('Info message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.level).toBe('info');
      expect(output.message).toBe('Info message');
    });

    it('should_log_error_level', () => {
      logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalled();
      const output = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
      expect(output.level).toBe('error');
      expect(output.message).toBe('Error message');
    });

    it('should_log_warn_level', () => {
      logger.warn('Warn message');

      expect(consoleSpy.warn).toHaveBeenCalled();
      const output = JSON.parse(consoleSpy.warn.mock.calls[0][0] as string);
      expect(output.level).toBe('warn');
      expect(output.message).toBe('Warn message');
    });

    it('should_log_debug_level', () => {
      logger.debug('Debug message');

      expect(consoleSpy.debug).toHaveBeenCalled();
      const output = JSON.parse(consoleSpy.debug.mock.calls[0][0] as string);
      expect(output.level).toBe('debug');
      expect(output.message).toBe('Debug message');
    });
  });

  describe('log level filtering', () => {
    it('should_filter_debug_when_level_is_info', () => {
      mockConfig.logLevel = 'info';
      logger = new AppLoggerService(mockConfig as AppConfigService);

      logger.debug('Debug message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('should_filter_info_when_level_is_warn', () => {
      mockConfig.logLevel = 'warn';
      logger = new AppLoggerService(mockConfig as AppConfigService);

      logger.log('Info message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should_filter_warn_when_level_is_error', () => {
      mockConfig.logLevel = 'error';
      logger = new AppLoggerService(mockConfig as AppConfigService);

      logger.warn('Warn message');

      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it('should_always_log_error_level', () => {
      mockConfig.logLevel = 'error';
      logger = new AppLoggerService(mockConfig as AppConfigService);

      logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('context handling', () => {
    it('should_accept_string_context', () => {
      logger.log('Message', 'StringContext');

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.context).toBe('StringContext');
    });

    it('should_accept_string_context_for_error', () => {
      logger.error('Error message', undefined, 'ErrorContext');

      const output = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
      expect(output.context).toBe('ErrorContext');
    });

    it('should_accept_string_context_for_warn', () => {
      logger.warn('Warn message', 'WarnContext');

      const output = JSON.parse(consoleSpy.warn.mock.calls[0][0] as string);
      expect(output.context).toBe('WarnContext');
    });

    it('should_accept_string_context_for_debug', () => {
      logger.debug('Debug message', 'DebugContext');

      const output = JSON.parse(consoleSpy.debug.mock.calls[0][0] as string);
      expect(output.context).toBe('DebugContext');
    });

    it('should_accept_object_context', () => {
      logger.log('Message', { userId: 'user-123', requestId: 'req-456' });

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.userId).toBe('user-123');
      expect(output.requestId).toBe('req-456');
    });

    it('should_merge_extra_context_properties', () => {
      logger.log('Message', { customField: 'value' });

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.customField).toBe('value');
    });
  });

  describe('error with stack trace', () => {
    it('should_include_stack_trace_in_development', () => {
      logger.error('Error message', 'Stack trace here');

      const output = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
      expect(output.stack).toBe('Stack trace here');
    });

    it('should_exclude_stack_trace_in_production', () => {
      mockConfig.isProduction = true;
      logger = new AppLoggerService(mockConfig as AppConfigService);

      logger.error('Error message', 'Stack trace here');

      const output = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
      expect(output.stack).toBeUndefined();
    });
  });

  describe('verbose and fatal', () => {
    it('should_map_verbose_to_debug', () => {
      logger.verbose('Verbose message');

      expect(consoleSpy.debug).toHaveBeenCalled();
      const output = JSON.parse(consoleSpy.debug.mock.calls[0][0] as string);
      expect(output.level).toBe('debug');
    });

    it('should_map_fatal_to_error', () => {
      logger.fatal('Fatal message');

      expect(consoleSpy.error).toHaveBeenCalled();
      const output = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
      expect(output.level).toBe('error');
    });
  });

  describe('logWithContext', () => {
    it('should_log_with_explicit_context', () => {
      logger.logWithContext('info', 'Message', {
        userId: 'user-123',
        requestId: 'req-456',
      });

      expect(consoleSpy.log).toHaveBeenCalled();
      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.userId).toBe('user-123');
      expect(output.requestId).toBe('req-456');
    });

    it('should_respect_log_level_filtering', () => {
      mockConfig.logLevel = 'error';
      logger = new AppLoggerService(mockConfig as AppConfigService);

      logger.logWithContext('info', 'Message', {});

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('JSON output', () => {
    it('should_include_timestamp', () => {
      logger.log('Message');

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.timestamp).toBeDefined();
      expect(new Date(output.timestamp).toISOString()).toBe(output.timestamp);
    });

    it('should_output_valid_json', () => {
      logger.log('Message');

      const outputString = consoleSpy.log.mock.calls[0][0] as string;
      expect(() => JSON.parse(outputString)).not.toThrow();
    });
  });
});
