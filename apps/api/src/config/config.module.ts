import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './config.service.js';

/**
 * ConfigModule - Global module providing configuration access
 *
 * Exports AppConfigService which wraps @life-assistant/config.
 * This is a global module, so it doesn't need to be imported in every module.
 */
@Global()
@Module({
  providers: [AppConfigService],
  exports: [AppConfigService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ConfigModule {}
