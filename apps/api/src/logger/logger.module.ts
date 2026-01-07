import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './logger.service';

/**
 * LoggerModule - Global module providing JSON structured logging
 *
 * Exports AppLoggerService which provides:
 * - JSON formatted log output
 * - Context-aware logging (userId, requestId)
 * - Log level filtering via LOG_LEVEL env
 */
@Global()
@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LoggerModule {}
