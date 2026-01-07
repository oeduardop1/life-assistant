import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify } from 'jose';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppConfigService } from '../../config/config.service';
import type { AuthenticatedRequest, AuthenticatedUser, JwtPayload } from '../types/request.types';

/**
 * AuthGuard - Validates Supabase JWT tokens
 *
 * Features:
 * - Validates JWT signature using SUPABASE_JWT_SECRET
 * - Extracts user_id from JWT sub claim
 * - Skips validation for routes marked with @Public()
 * - Attaches user to request object
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly secretKey: Uint8Array;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfigService,
  ) {
    // Encode secret as Uint8Array for jose
    this.secretKey = new TextEncoder().encode(this.config.supabaseJwtSecret);
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
   */
  private async verifyToken(token: string): Promise<JwtPayload> {
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
