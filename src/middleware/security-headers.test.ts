import { assertEquals } from '@std/assert';
import { Hono } from '@hono/hono';
import { securityHeaders } from './security-headers.ts';
import type { AlpineAppState } from '../types.ts';
import { createRuntimeConfig } from '../test/runtime-config.ts';

const createApp = (dev: boolean, contentType?: string, presetCsp?: string): Hono<{ Variables: AlpineAppState }> => {
  const app = new Hono<{ Variables: AlpineAppState }>();

  app.use(async (c, next) => {
    c.set('config', createRuntimeConfig(dev, './public'));
    await next();
  });
  app.use(securityHeaders);
  app.get('/', (c) => {
    if (presetCsp) {
      c.header('Content-Security-Policy', presetCsp);
    }
    if (contentType) {
      c.header('content-type', contentType);
    }
    return c.body(null);
  });

  return app;
};

Deno.test('securityHeaders', async (t) => {
  await t.step('should set basic security headers', async () => {
    const app = createApp(false);
    const response = await app.request('/');

    assertEquals(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assertEquals(response.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
    assertEquals(response.headers.get('Permissions-Policy'), 'geolocation=(), microphone=(), camera=()');
    assertEquals(response.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
    assertEquals(response.headers.get('Cross-Origin-Opener-Policy'), 'same-origin');
  });

  await t.step('should set HSTS in production', async () => {
    const app = createApp(false);
    const response = await app.request('/');

    assertEquals(response.headers.get('Strict-Transport-Security'), 'max-age=31536000');
  });

  await t.step('should not set HSTS in dev mode', async () => {
    const app = createApp(true);
    const response = await app.request('/');

    assertEquals(response.headers.get('Strict-Transport-Security'), null);
  });

  await t.step('should set CSP for HTML content', async () => {
    const app = createApp(false, 'text/html; charset=utf-8');
    const response = await app.request('/');

    const csp = response.headers.get('Content-Security-Policy');
    assertEquals(typeof csp, 'string');
    assertEquals(csp?.includes("default-src 'self'"), true);
    assertEquals(csp?.includes("script-src 'self' 'unsafe-eval'"), true);
    assertEquals(csp?.includes("object-src 'none'"), true);
    assertEquals(csp?.includes("frame-ancestors 'none'"), true);
  });

  await t.step('should not set CSP for non-HTML content', async () => {
    const app = createApp(false, 'application/json');
    const response = await app.request('/');

    assertEquals(response.headers.get('Content-Security-Policy'), null);
  });

  await t.step('should handle missing content-type', async () => {
    const app = createApp(false);
    const response = await app.request('/');

    assertEquals(response.headers.get('Content-Security-Policy'), null);
  });

  await t.step('should handle case-insensitive content-type', async () => {
    const app = createApp(false, 'TEXT/HTML');
    const response = await app.request('/');

    const csp = response.headers.get('Content-Security-Policy');
    assertEquals(typeof csp, 'string');
  });

  await t.step('should not override existing CSP', async () => {
    const app = createApp(false, 'text/html', "default-src 'self' https://esm.sh");
    const response = await app.request('/');

    assertEquals(response.headers.get('Content-Security-Policy'), "default-src 'self' https://esm.sh");
  });
});
