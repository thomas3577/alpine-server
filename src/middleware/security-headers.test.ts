import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from '@hono/hono';
import { securityHeaders } from './security-headers.ts';
import type { AlpineAppState } from '../types.ts';
import { createRuntimeConfig } from '../test/runtime-config.ts';

const createApp = (dev: boolean, contentType?: string, presetCsp?: string, presetHeaders: Record<string, string> = {}): Hono<{ Variables: AlpineAppState }> => {
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
    for (const [name, value] of Object.entries(presetHeaders)) {
      c.header(name, value);
    }
    if (contentType) {
      c.header('content-type', contentType);
    }
    return c.body(null);
  });

  return app;
};

describe('securityHeaders', () => {
  it('should set basic security headers', async () => {
    const app = createApp(false);
    const response = await app.request('/');

    assert.deepEqual(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.deepEqual(response.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
    assert.deepEqual(response.headers.get('Permissions-Policy'), 'geolocation=(), microphone=(), camera=()');
    assert.deepEqual(response.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
    assert.deepEqual(response.headers.get('Cross-Origin-Opener-Policy'), 'same-origin');
  });

  it('should set HSTS in production', async () => {
    const app = createApp(false);
    const response = await app.request('/');

    assert.deepEqual(response.headers.get('Strict-Transport-Security'), 'max-age=31536000');
  });

  it('should not set HSTS in dev mode', async () => {
    const app = createApp(true);
    const response = await app.request('/');

    assert.deepEqual(response.headers.get('Strict-Transport-Security'), null);
  });

  it('should set CSP for HTML content', async () => {
    const app = createApp(false, 'text/html; charset=utf-8');
    const response = await app.request('/');

    const csp = response.headers.get('Content-Security-Policy');
    assert.deepEqual(typeof csp, 'string');
    assert.deepEqual(csp?.includes("default-src 'self'"), true);
    assert.deepEqual(csp?.includes("script-src 'self' 'unsafe-eval'"), true);
    assert.deepEqual(csp?.includes("object-src 'none'"), true);
    assert.deepEqual(csp?.includes("frame-ancestors 'none'"), true);
  });

  it('should not set CSP for non-HTML content', async () => {
    const app = createApp(false, 'application/json');
    const response = await app.request('/');

    assert.deepEqual(response.headers.get('Content-Security-Policy'), null);
  });

  it('should handle missing content-type', async () => {
    const app = createApp(false);
    const response = await app.request('/');

    assert.deepEqual(response.headers.get('Content-Security-Policy'), null);
  });

  it('should handle case-insensitive content-type', async () => {
    const app = createApp(false, 'TEXT/HTML');
    const response = await app.request('/');

    const csp = response.headers.get('Content-Security-Policy');
    assert.deepEqual(typeof csp, 'string');
  });

  it('should not override existing CSP', async () => {
    const app = createApp(false, 'text/html', "default-src 'self' https://esm.sh");
    const response = await app.request('/');

    assert.deepEqual(response.headers.get('Content-Security-Policy'), "default-src 'self' https://esm.sh");
  });

  const presets: Record<string, string> = {
    'X-Content-Type-Options': 'custom',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'geolocation=(self)',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  };

  for (const [name, value] of Object.entries(presets)) {
    it(`should not override existing ${name}`, async () => {
      const app = createApp(false, undefined, undefined, { [name]: value });
      const response = await app.request('/');

      assert.deepEqual(response.headers.get(name), value);
    });
  }
});
