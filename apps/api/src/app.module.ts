import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Core modules
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ChatModule } from './modules/chat/chat.module';
import { MemoryModule } from './modules/memory/memory.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AdminModule } from './modules/admin/admin.module';

// Jobs
import { JobsModule } from './jobs/jobs.module';

// Common
import { RequestIdMiddleware } from './common/middleware/index';
import { AuthGuard } from './common/guards/index';
import { LoggingInterceptor, TransformInterceptor } from './common/interceptors/index';
import { AllExceptionsFilter } from './common/filters/index';

/**
 * AppModule - Root application module
 *
 * Configures:
 * - Global modules (Config, Logger, Database)
 * - Middleware (RequestId)
 * - Guards (Auth, Throttler)
 * - Interceptors (Logging, Transform)
 * - Filters (AllExceptions)
 */
@Module({
  imports: [
    // Core modules (global)
    ConfigModule,
    LoggerModule,
    DatabaseModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),

    // Feature modules
    HealthModule,
    AuthModule,
    OnboardingModule,
    ChatModule,
    MemoryModule,
    TrackingModule,
    FinanceModule,

    // Background jobs
    JobsModule,

    // Admin module (development only)
    ...(process.env.NODE_ENV === 'development' ? [AdminModule] : []),
  ],
  providers: [
    // Global auth guard (requires @Public() to bypass)
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // Rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Response transform interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply RequestIdMiddleware to all routes
    // NestJS 11+ requires named wildcards for path-to-regexp v8+
    // {*splat} = named wildcard wrapped in braces (matches all including root)
    consumer.apply(RequestIdMiddleware).forRoutes('{*splat}');
  }
}
