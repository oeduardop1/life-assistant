import { SetMetadata } from '@nestjs/common';

/**
 * SKIP_TRANSFORM_KEY - Metadata key for skipping response transformation
 */
export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * @SkipTransform() - Marks an endpoint to skip the TransformInterceptor
 *
 * Use this decorator for endpoints that need raw responses:
 * - SSE endpoints (use their own format)
 * - File downloads
 * - Proxy endpoints
 *
 * @example
 * @SkipTransform()
 * @Sse('stream')
 * stream(): Observable<MessageEvent> {}
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
