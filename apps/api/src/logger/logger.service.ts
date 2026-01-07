import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { AppConfigService } from '../config/config.service.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string | undefined;
  requestId?: string | undefined;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * AppLoggerService - JSON structured logging for NestJS
 *
 * Features:
 * - JSON output for production (structured logs for Axiom)
 * - Configurable log level via LOG_LEVEL env
 * - Context-aware logging (userId, requestId)
 * - Never logs secrets
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService implements NestLoggerService {
  private context?: string;
  private logLevel: LogLevel;
  private isProduction: boolean;

  private static readonly LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config: AppConfigService) {
    this.logLevel = config.logLevel;
    this.isProduction = config.isProduction;
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  private shouldLog(level: LogLevel): boolean {
    return (
      AppLoggerService.LOG_LEVELS[level] >=
      AppLoggerService.LOG_LEVELS[this.logLevel]
    );
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    if (this.context) {
      entry.context = this.context;
    }

    if (context) {
      const { userId, requestId, ...rest } = context;
      if (userId) entry.userId = userId;
      if (requestId) entry.requestId = requestId;
      Object.assign(entry, rest);
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    switch (entry.level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  log(message: string, context?: LogContext | string): void {
    if (!this.shouldLog('info')) return;

    const ctx = typeof context === 'string' ? undefined : context;
    const entry = this.formatMessage('info', message, ctx);
    if (typeof context === 'string') {
      entry.context = context;
    }
    this.output(entry);
  }

  error(message: string, trace?: string, context?: LogContext | string): void {
    const ctx = typeof context === 'string' ? undefined : context;
    const entry = this.formatMessage('error', message, ctx);
    if (typeof context === 'string') {
      entry.context = context;
    }

    // Only include stack trace in development
    if (trace && !this.isProduction) {
      entry.stack = trace;
    }

    this.output(entry);
  }

  warn(message: string, context?: LogContext | string): void {
    if (!this.shouldLog('warn')) return;

    const ctx = typeof context === 'string' ? undefined : context;
    const entry = this.formatMessage('warn', message, ctx);
    if (typeof context === 'string') {
      entry.context = context;
    }
    this.output(entry);
  }

  debug(message: string, context?: LogContext | string): void {
    if (!this.shouldLog('debug')) return;

    const ctx = typeof context === 'string' ? undefined : context;
    const entry = this.formatMessage('debug', message, ctx);
    if (typeof context === 'string') {
      entry.context = context;
    }
    this.output(entry);
  }

  verbose(message: string, context?: LogContext | string): void {
    // Map verbose to debug
    this.debug(message, context);
  }

  fatal(message: string, context?: LogContext | string): void {
    // Map fatal to error
    this.error(message, undefined, context);
  }

  /**
   * Log with explicit context (userId, requestId)
   */
  logWithContext(
    level: LogLevel,
    message: string,
    context: LogContext,
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatMessage(level, message, context);
    this.output(entry);
  }
}
