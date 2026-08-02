import type { Context, Next } from '@hono/hono';
import { bold, cyan, green } from '@std/fmt/colors';
import { info } from '@std/log';

/**
 * Logs request method, path, and measured response time.
 */
export const logger = async (c: Context, next: Next): Promise<void> => {
  await next();

  // Skip noisy exploit-scan requests we intentionally blocked.
  // deno-lint-ignore no-explicit-any
  if ((c as any).get('shield')?.blocked) {
    return;
  }

  const responseTime: string | null = c.res.headers.get('X-Response-Time');
  const method: string = c.req.method;
  const path: string = c.req.path;

  info(`${green(method)} ${cyan(path)} - ${bold(String(responseTime))}`);
};
