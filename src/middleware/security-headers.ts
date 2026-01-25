import type { Context } from '@oak/oak';

import type { AlpineAppState } from '../types.ts';

const buildCspHeaderValue = (): string => {
  // NOTE: Alpine (default build) relies on Function() which requires 'unsafe-eval'.
  // If you switch to an Alpine CSP build later, you can remove 'unsafe-eval'.
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self' 'unsafe-eval'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
  ].join('; ');
};

export const securityHeaders = async (context: Context<AlpineAppState>, next: () => Promise<unknown>): Promise<void> => {
  await next();

  const headers = context.response.headers;

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  if (!context.state.config.dev) {
    // Only enable HSTS in production (requires HTTPS).
    headers.set('Strict-Transport-Security', 'max-age=31536000');
  }

  const contentType = (headers.get('content-type') ?? '').toLowerCase();
  const hasCsp = headers.get('Content-Security-Policy') !== null;
  if (!hasCsp && contentType.includes('text/html')) {
    headers.set('Content-Security-Policy', buildCspHeaderValue());
  }
};
