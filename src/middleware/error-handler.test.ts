import { assertEquals } from '@std/assert';
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

Deno.test('errorHandler', async (t) => {
  await t.step('should pass through successful requests', async () => {
    const app = createApp(false);
    const response = await app.request('/');

    assertEquals(response.status, 200);
    assertEquals(await response.text(), 'ok');
  });

  await t.step('should handle HTTP errors with JSON response', async () => {
    const app = createApp(false, () => {
      throw new HTTPException(404, { message: 'Resource not found' });
    });
    const response = await app.request('/', { headers: { Accept: 'application/json' } });

    assertEquals(response.status, 404);
    assertEquals(response.headers.get('content-type')?.includes('application/json'), true);
    const body = (await response.json()) as ErrorResponseBody;
    assertEquals(body.message, 'Resource not found');
    assertEquals(body.status, 404);
    assertEquals(body.stack, undefined);
  });

  await t.step('should handle HTTP errors with JSON response in dev mode', async () => {
    const app = createApp(true, () => {
      throw new HTTPException(500, { message: 'Server error' });
    });
    const response = await app.request('/', { headers: { Accept: 'application/json' } });

    assertEquals(response.status, 500);
    const body = (await response.json()) as ErrorResponseBody;
    assertEquals(body.message, 'Server error');
    assertEquals(body.status, 500);
    assertEquals(typeof body.stack, 'string');
  });

  await t.step('should handle HTTP errors with text response', async () => {
    const app = createApp(false, () => {
      throw new HTTPException(403, { message: 'Forbidden' });
    });
    const response = await app.request('/');

    assertEquals(response.status, 403);
    assertEquals(response.headers.get('content-type')?.includes('text/plain'), true);
    assertEquals(await response.text(), '403 Forbidden');
  });

  await t.step('should handle HTTP errors with text response in dev mode', async () => {
    const app = createApp(true, () => {
      throw new HTTPException(400, { message: 'Bad Request' });
    });
    const response = await app.request('/');

    assertEquals(response.status, 400);
    const text = await response.text();
    assertEquals(text.includes('400 Bad Request'), true);
  });

  await t.step('should handle Deno.errors.NotFound', async () => {
    const app = createApp(false, () => {
      throw new Deno.errors.NotFound('File not found');
    });
    const response = await app.request('/');

    assertEquals(response.status, 404);
    assertEquals(await response.text(), 'Not Found');
  });

  await t.step('should handle generic errors in production', async () => {
    const app = createApp(false, () => {
      throw new Error('Something went wrong');
    });
    const response = await app.request('/');

    assertEquals(response.status, 500);
    assertEquals(await response.text(), 'Internal Server Error');
  });

  await t.step('should handle generic errors in dev mode', async () => {
    const app = createApp(true, () => {
      throw new Error('Something went wrong');
    });
    const response = await app.request('/');

    assertEquals(response.status, 500);
    const text = await response.text();
    assertEquals(text.includes('Internal Server Error'), true);
    assertEquals(text.includes('Something went wrong'), true);
  });
});
