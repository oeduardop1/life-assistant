import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { jwtVerify, importJWK, type JWK } from 'jose';
import { AppConfigService } from '../../config/config.service';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types/request.types';

/**
 * SseAuthGuard - Validates JWT tokens from query parameters for SSE endpoints
 *
 * EventSource (SSE) doesn't support custom headers, so authentication
 * must be done via query parameter. This guard:
 * - Extracts token from ?token= query parameter
 * - Validates JWT using ES256 (via JWKS) or HS256 (fallback)
 * - Attaches user to request for @SseCurrentUser() decorator
 *
 * @example
 * @UseGuards(SseAuthGuard)
 * @Sse('stream')
 * @Public() // Still need @Public() to bypass global AuthGuard
 * stream(@SseCurrentUser() userId: string): Observable<MessageEvent> {}
 */
@Injectable()
export class SseAuthGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(SseAuthGuard.name);
  private readonly secretKey: Uint8Array;
  private cachedPublicKey: CryptoKey | Uint8Array | null = null;
  private readonly jwksUrl: URL;

  constructor(private readonly config: AppConfigService) {
    this.secretKey = new TextEncoder().encode(this.config.supabaseJwtSecret);
    this.jwksUrl = new URL(`${this.config.supabaseUrl}/auth/v1/.well-known/jwks.json`);
  }

  async onModuleInit(): Promise<void> {
    await this.initializeJwks();
  }

  /**
   * Initialize JWKS key set for ES256 verification
   */
  private async initializeJwks(): Promise<void> {
    try {
      const response = await fetch(this.jwksUrl.toString());
      if (!response.ok) {
        this.logger.warn(`Failed to fetch JWKS: ${String(response.status)}, falling back to HS256`);
        return;
      }
      const jwks = (await response.json()) as { keys?: JWK[] };
      const firstKey = jwks.keys?.[0];
      if (firstKey) {
        this.cachedPublicKey = await importJWK(firstKey, 'ES256');
        this.logger.log('JWKS initialized successfully for ES256 verification');
      }
    } catch (error) {
      this.logger.warn(`Failed to initialize JWKS: ${String(error)}, falling back to HS256`);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Extract token from query parameter
    const token = request.query.token as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.verifyToken(token);

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token: missing subject');
      }

      // Attach user to request for use by @SseCurrentUser() decorator
      const user: AuthenticatedUser = {
        id: payload.sub as string,
        email: payload.email as string | undefined,
        role: payload.role as string | undefined,
      };

      request.user = user;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Token verification failed: ${String(error)}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Verify JWT token using jose
   * Tries ES256 (via JWKS) first, falls back to HS256
   */
  private async verifyToken(token: string): Promise<Record<string, unknown>> {
    // Try ES256 verification first if JWKS is available
    if (this.cachedPublicKey) {
      try {
        const { payload } = await jwtVerify(token, this.cachedPublicKey, {
          algorithms: ['ES256'],
        });
        return payload as Record<string, unknown>;
      } catch {
        // ES256 failed, try HS256 as fallback
        this.logger.debug('ES256 verification failed, trying HS256');
      }
    }

    // Fallback to HS256 verification
    const { payload } = await jwtVerify(token, this.secretKey, {
      algorithms: ['HS256'],
    });

    return payload as Record<string, unknown>;
  }
}
