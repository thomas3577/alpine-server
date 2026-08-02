import type { Context, Next } from '@hono/hono';

/**
 * Measures request duration and exposes timing headers.
 */
export const timing = async (c: Context, next: Next): Promise<void> => {
  const start = performance.now();

  await next();

  const durationMs = performance.now() - start;
  const rounded = Math.round(durationMs * 10) / 10;

  c.header('X-Response-Time', `${rounded}ms`);
  // Useful for performance debugging in browser devtools.
  c.header('Server-Timing', `app;dur=${rounded}`, { append: true });
};
