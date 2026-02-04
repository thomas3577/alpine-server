import type { Context } from '@oak/oak';
import { bold, cyan, green } from '@std/fmt/colors';
import { info } from '@std/log';

export const logger = async (context: Context, next: () => Promise<unknown>): Promise<void> => {
  await next();

  // Skip noisy exploit-scan requests we intentionally blocked.
  // deno-lint-ignore no-explicit-any
  if ((context.state as any)?.shield?.blocked) {
    return;
  }

  const responseTime: string | null = context.response.headers.get('X-Response-Time');
  const method: string = context.request.method;
  const path: string = context.request.url.pathname;

  info(`${green(method)} ${cyan(path)} - ${bold(String(responseTime))}`);
};
