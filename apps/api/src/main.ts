// Sentry instrumentation MUST be imported first
// See: https://docs.sentry.io/platforms/javascript/guides/node/install/commonjs/
import './instrument';

import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load .env from workspace root (must be before other imports that use env vars)
loadEnv({ path: resolve(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { AppLoggerService } from './logger/logger.service';

/**
 * Bootstrap the NestJS application
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get services
  const config = app.get(AppConfigService);
  const logger = await app.resolve(AppLoggerService);
  logger.setContext('Bootstrap');

  // Use custom logger
  app.useLogger(logger);

  // ============================================
  // Global prefix
  // ============================================
  app.setGlobalPrefix('api');

  // ============================================
  // CORS configuration
  // ============================================
  app.enableCors({
    origin: config.frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    credentials: true,
  });

  // ============================================
  // Validation pipe
  // ============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error for unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ============================================
  // Swagger/OpenAPI documentation
  // ============================================
  if (!config.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Life Assistant API')
      .setDescription('API documentation for Life Assistant')
      .setVersion(config.appVersion)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your Supabase JWT token',
        },
        'bearer',
      )
      .addTag('Health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log('Swagger documentation available at /api/docs');
  }

  // ============================================
  // Graceful shutdown
  // ============================================
  app.enableShutdownHooks();

  // ============================================
  // Start server
  // ============================================
  const port = config.port;
  await app.listen(port);

  logger.log(`Application running on port ${String(port)}`);
  logger.log(`Environment: ${config.nodeEnv}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
