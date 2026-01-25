import { assertEquals } from '@std/assert';
import { securityHeaders } from './security-headers.ts';
import type { Context } from '@oak/oak';
import type { AlpineAppState } from '../types.ts';

const createMockContext = (dev: boolean, contentType?: string): Context<AlpineAppState> => {
  const headers = new Map<string, string>();
  if (contentType) {
    headers.set('content-type', contentType);
  }

  const ctx = {
    response: {
      headers: {
        get: (key: string) => headers.get(key) ?? null,
        set: (key: string, value: string) => headers.set(key, value),
      },
    },
    state: {
      config: {
        dev,
        production: !dev,
        staticFilesPath: './public',
        staticExtensions: [],
        vendors: {},
      },
    },
  } as unknown as Context<AlpineAppState>;

  return ctx;
};

Deno.test('securityHeaders', async (t) => {
  await t.step('should set basic security headers', async () => {
    const ctx = createMockContext(false);

    await securityHeaders(ctx, async () => {});

    assertEquals(ctx.response.headers.get('X-Content-Type-Options'), 'nosniff');
    assertEquals(ctx.response.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
    assertEquals(ctx.response.headers.get('Permissions-Policy'), 'geolocation=(), microphone=(), camera=()');
    assertEquals(ctx.response.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
    assertEquals(ctx.response.headers.get('Cross-Origin-Opener-Policy'), 'same-origin');
  });

  await t.step('should set HSTS in production', async () => {
    const ctx = createMockContext(false);

    await securityHeaders(ctx, async () => {});

    assertEquals(ctx.response.headers.get('Strict-Transport-Security'), 'max-age=31536000');
  });

  await t.step('should not set HSTS in dev mode', async () => {
    const ctx = createMockContext(true);

    await securityHeaders(ctx, async () => {});

    assertEquals(ctx.response.headers.get('Strict-Transport-Security'), null);
  });

  await t.step('should set CSP for HTML content', async () => {
    const ctx = createMockContext(false, 'text/html; charset=utf-8');

    await securityHeaders(ctx, async () => {});

    const csp = ctx.response.headers.get('Content-Security-Policy');
    assertEquals(typeof csp, 'string');
    assertEquals(csp?.includes("default-src 'self'"), true);
    assertEquals(csp?.includes("script-src 'self' 'unsafe-eval'"), true);
    assertEquals(csp?.includes("object-src 'none'"), true);
    assertEquals(csp?.includes("frame-ancestors 'none'"), true);
  });

  await t.step('should not set CSP for non-HTML content', async () => {
    const ctx = createMockContext(false, 'application/json');

    await securityHeaders(ctx, async () => {});

    assertEquals(ctx.response.headers.get('Content-Security-Policy'), null);
  });

  await t.step('should handle missing content-type', async () => {
    const ctx = createMockContext(false);

    await securityHeaders(ctx, async () => {});

    assertEquals(ctx.response.headers.get('Content-Security-Policy'), null);
  });

  await t.step('should handle case-insensitive content-type', async () => {
    const ctx = createMockContext(false, 'TEXT/HTML');

    await securityHeaders(ctx, async () => {});

    const csp = ctx.response.headers.get('Content-Security-Policy');
    assertEquals(typeof csp, 'string');
  });

  await t.step('should not override existing CSP', async () => {
    const ctx = createMockContext(false, 'text/html');
    ctx.response.headers.set('Content-Security-Policy', "default-src 'self' https://esm.sh");

    await securityHeaders(ctx, async () => {});

    assertEquals(ctx.response.headers.get('Content-Security-Policy'), "default-src 'self' https://esm.sh");
  });
});
