import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '../../../src/common/guards/auth.guard.js';
import { AppConfigService } from '../../../src/config/config.service.js';
import { IS_PUBLIC_KEY } from '../../../src/common/decorators/public.decorator.js';
import * as jose from 'jose';

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  let reflector: Reflector;
  let configService: AppConfigService;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: { headers: Record<string, string>; user?: unknown };

  const validPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    configService = {
      supabaseJwtSecret: 'super-secret-jwt-token-with-at-least-32-characters-for-testing',
    } as AppConfigService;

    authGuard = new AuthGuard(reflector, configService);

    mockRequest = {
      headers: {},
    };

    mockExecutionContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(mockRequest),
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    } as unknown as ExecutionContext;
  });

  describe('canActivate', () => {
    it('should_allow_when_route_is_public', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await authGuard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should_reject_when_no_authorization_header', async () => {
      mockRequest.headers = {};

      await expect(authGuard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Missing authorization token'),
      );
    });

    it('should_reject_when_no_bearer_token', async () => {
      mockRequest.headers = { authorization: 'Basic abc123' };

      await expect(authGuard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Missing authorization token'),
      );
    });

    it('should_allow_when_valid_token', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      vi.mocked(jose.jwtVerify).mockResolvedValue({
        payload: validPayload,
        protectedHeader: { alg: 'HS256' },
      } as unknown as jose.JWTVerifyResult<jose.JWTPayload>);

      const result = await authGuard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'authenticated',
      });
    });

    it('should_reject_when_invalid_token', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      vi.mocked(jose.jwtVerify).mockRejectedValue(new Error('Invalid token'));

      await expect(authGuard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });

    it('should_reject_when_token_missing_subject', async () => {
      mockRequest.headers = { authorization: 'Bearer token-without-sub' };

      vi.mocked(jose.jwtVerify).mockResolvedValue({
        payload: { email: 'test@example.com' },
        protectedHeader: { alg: 'HS256' },
      } as unknown as jose.JWTVerifyResult<jose.JWTPayload>);

      await expect(authGuard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid token: missing subject'),
      );
    });

    it('should_use_HS256_algorithm', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      vi.mocked(jose.jwtVerify).mockResolvedValue({
        payload: validPayload,
        protectedHeader: { alg: 'HS256' },
      } as unknown as jose.JWTVerifyResult<jose.JWTPayload>);

      await authGuard.canActivate(mockExecutionContext);

      expect(jose.jwtVerify).toHaveBeenCalledWith(
        'valid-token',
        expect.any(Uint8Array),
        { algorithms: ['HS256'] },
      );
    });
  });
});
