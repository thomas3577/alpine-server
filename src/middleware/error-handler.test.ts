import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from '@hono/hono';
import { HTTPException } from '@hono/hono/http-exception';
import { errorHandler } from './error-handler.ts';
import type { AlpineAppState } from '../types.ts';
import { createRuntimeConfig } from '../test/runtime-config.ts';

interface ErrorResponseBody {
  message: string;
  status: number;
  stack?: string;
}

const createApp = (dev: boolean, thrower?: () => void): Hono<{ Variables: AlpineAppState }> => {
  const app = new Hono<{ Variables: AlpineAppState }>();

  app.use(async (c, next) => {
    c.set('config', createRuntimeConfig(dev, './public'));
    await next();
  });
  app.onError(errorHandler);
  app.get('/', (c) => {
    thrower?.();
    return c.text('ok');
  });

  return app;
};

describe('errorHandler', () => {
  afterEach(() => mock.restoreAll());

  it('should pass through successful requests', async () => {
    const app = createApp(false);
    const response = await app.request('/');

    assert.deepEqual(response.status, 200);
    assert.deepEqual(await response.text(), 'ok');
  });

  it('should handle HTTP errors with JSON response', async () => {
    const app = createApp(false, () => {
      throw new HTTPException(404, { message: 'Resource not found' });
    });
    const response = await app.request('/', { headers: { Accept: 'application/json' } });

    assert.deepEqual(response.status, 404);
    assert.deepEqual(response.headers.get('content-type')?.includes('application/json'), true);
    const body = (await response.json()) as ErrorResponseBody;
    assert.deepEqual(body.message, 'Resource not found');
    assert.deepEqual(body.status, 404);
    assert.deepEqual(body.stack, undefined);
  });

  it('should handle HTTP errors with JSON response in dev mode', async () => {
    const app = createApp(true, () => {
      throw new HTTPException(500, { message: 'Server error' });
    });
    const response = await app.request('/', { headers: { Accept: 'application/json' } });

    assert.deepEqual(response.status, 500);
    const body = (await response.json()) as ErrorResponseBody;
    assert.deepEqual(body.message, 'Server error');
    assert.deepEqual(body.status, 500);
    assert.deepEqual(typeof body.stack, 'string');
  });

  it('should handle HTTP errors with text response', async () => {
    const app = createApp(false, () => {
      throw new HTTPException(403, { message: 'Forbidden' });
    });
    const response = await app.request('/');

    assert.deepEqual(response.status, 403);
    assert.deepEqual(response.headers.get('content-type')?.includes('text/plain'), true);
    assert.deepEqual(await response.text(), '403 Forbidden');
  });

  it('should handle HTTP errors with text response in dev mode', async () => {
    const app = createApp(true, () => {
      throw new HTTPException(400, { message: 'Bad Request' });
    });
    const response = await app.request('/');

    assert.deepEqual(response.status, 400);
    const text = await response.text();
    assert.deepEqual(text.includes('400 Bad Request'), true);
  });

  it('should handle ENOENT errors as 404', async () => {
    const app = createApp(false, () => {
      throw Object.assign(new Error('File not found'), { code: 'ENOENT' });
    });
    const response = await app.request('/');

    assert.deepEqual(response.status, 404);
    assert.deepEqual(await response.text(), 'Not Found');
  });

  it('should handle Deno-style NotFound errors as 404', async () => {
    const app = createApp(false, () => {
      throw Object.assign(new Error('File not found'), { name: 'NotFound' });
    });
    const response = await app.request('/');

    assert.deepEqual(response.status, 404);
  });

  it('should handle generic errors in production', async () => {
    mock.method(console, 'error', () => {});
    const app = createApp(false, () => {
      throw new Error('Something went wrong');
    });
    const response = await app.request('/');

    assert.deepEqual(response.status, 500);
    assert.deepEqual(await response.text(), 'Internal Server Error');
  });

  it('should handle generic errors in dev mode', async () => {
    mock.method(console, 'error', () => {});
    const app = createApp(true, () => {
      throw new Error('Something went wrong');
    });
    const response = await app.request('/');

    assert.deepEqual(response.status, 500);
    const text = await response.text();
    assert.deepEqual(text.includes('Internal Server Error'), true);
    assert.deepEqual(text.includes('Something went wrong'), true);
  });
});
