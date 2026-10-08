/** Sets CSP, HSTS, and other security-related response headers. */
import type { Context, Next } from '@hono/hono';
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

/**
 * Applies secure default response headers and CSP for HTML responses.
 */
export const securityHeaders = async (c: Context<{ Variables: AlpineAppState }>, next: Next): Promise<void> => {
  await next();

  // Defaults only fill gaps; values set by app middlewares or handlers win.
  const setDefault = (name: string, value: string): void => {
    if (c.res.headers.get(name) === null) {
      c.header(name, value);
    }
  };

  setDefault('X-Content-Type-Options', 'nosniff');
  setDefault('Referrer-Policy', 'strict-origin-when-cross-origin');
  setDefault('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  setDefault('Cross-Origin-Resource-Policy', 'same-origin');
  setDefault('Cross-Origin-Opener-Policy', 'same-origin');

  if (!c.get('config').dev) {
    // Only enable HSTS in production (requires HTTPS).
    setDefault('Strict-Transport-Security', 'max-age=31536000');
  }

  const contentType = (c.res.headers.get('content-type') ?? '').toLowerCase();
  const hasCsp = c.res.headers.get('Content-Security-Policy') !== null;
  if (!hasCsp && contentType.includes('text/html')) {
    c.header('Content-Security-Policy', buildCspHeaderValue());
  }
};
