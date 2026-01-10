import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify, importJWK, type JWK } from 'jose';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppConfigService } from '../../config/config.service';
import type { AuthenticatedRequest, AuthenticatedUser, JwtPayload } from '../types/request.types';

/**
 * AuthGuard - Validates Supabase JWT tokens
 *
 * Features:
 * - Validates JWT signature using Supabase JWKS (ES256) or fallback to HS256
 * - Extracts user_id from JWT sub claim
 * - Skips validation for routes marked with @Public()
 * - Attaches user to request object
 */
@Injectable()
export class AuthGuard implements CanActivate, OnModuleInit {
  private readonly secretKey: Uint8Array;
  private cachedPublicKey: CryptoKey | Uint8Array | null = null;
  private readonly jwksUrl: URL;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfigService,
  ) {
    // Encode secret as Uint8Array for jose (fallback for HS256)
    this.secretKey = new TextEncoder().encode(this.config.supabaseJwtSecret);
    // JWKS endpoint for Supabase Auth
    this.jwksUrl = new URL(`${this.config.supabaseUrl}/auth/v1/.well-known/jwks.json`);
  }

  async onModuleInit(): Promise<void> {
    // Pre-fetch the JWKS on startup
    await this.initializeJwks();
  }

  /**
   * Initialize JWKS key set for ES256 verification
   */
  private async initializeJwks(): Promise<void> {
    try {
      const response = await fetch(this.jwksUrl.toString());
      if (!response.ok) {
        console.warn(`Failed to fetch JWKS: ${String(response.status)}, falling back to HS256`);
        return;
      }
      const jwks = (await response.json()) as { keys?: JWK[] };
      const firstKey = jwks.keys?.[0];
      if (firstKey) {
        // Cache the first public key for ES256
        this.cachedPublicKey = await importJWK(firstKey, 'ES256');
      }
    } catch (error) {
      console.warn(`Failed to initialize JWKS: ${String(error)}, falling back to HS256`);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const payload = await this.verifyToken(token);
      const user = this.extractUser(payload);

      // Attach user to request for use by @CurrentUser() decorator
      request.user = user;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Extract Bearer token from Authorization header
   */
  private extractTokenFromHeader(request: AuthenticatedRequest): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  /**
   * Verify JWT token using jose
   * Tries ES256 (via JWKS) first, falls back to HS256
   */
  private async verifyToken(token: string): Promise<JwtPayload> {
    // Try ES256 verification first if JWKS is available
    if (this.cachedPublicKey) {
      try {
        const { payload } = await jwtVerify(token, this.cachedPublicKey, {
          algorithms: ['ES256'],
        });
        return payload as unknown as JwtPayload;
      } catch {
        // ES256 failed, try HS256 as fallback
      }
    }

    // Fallback to HS256 verification
    const { payload } = await jwtVerify(token, this.secretKey, {
      algorithms: ['HS256'],
    });

    return payload as unknown as JwtPayload;
  }

  /**
   * Extract AuthenticatedUser from JWT payload
   */
  private extractUser(payload: JwtPayload): AuthenticatedUser {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
