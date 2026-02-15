import type { Context } from '@oak/oak';

/**
 * Measures request duration and exposes timing headers.
 */
export const timing = async (context: Context, next: () => Promise<unknown>): Promise<void> => {
  const start = performance.now();

  await next();

  const durationMs = performance.now() - start;
  const rounded = Math.round(durationMs * 10) / 10;

  context.response.headers.set('X-Response-Time', `${rounded}ms`);
  // Useful for performance debugging in browser devtools.
  context.response.headers.append('Server-Timing', `app;dur=${rounded}`);
};
