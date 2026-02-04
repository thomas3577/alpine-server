import type { Context } from '@oak/oak';

const blockedPathPatterns: RegExp[] = [
  /^\/cgi-bin(\/|$)/i,
  /^\/\.env(\.|$)/i,
  /^\/\.git(\/|$)/i,
  /^\/\.svn(\/|$)/i,
  /^\/\.hg(\/|$)/i,
  /^\/wp-admin(\/|$)/i,
  /^\/wp-login\.php$/i,
  /^\/wp-content(\/|$)/i,
  /^\/wp-includes(\/|$)/i,
  /^\/phpmyadmin(\/|$)/i,
];

const blockedFileExtensions: RegExp = /\.(php|phtml|asp|aspx|jsp|cgi|pl|ini|env|sql|bak|old|swp|pem|key)$/i;

type RateBucket = {
  resetAt: number;
  count: number;
};

const buckets = new Map<string, RateBucket>();

const getClientIp = (ctx: Context): string => {
  // Deno Deploy sets X-Forwarded-For.
  const xff = ctx.request.headers.get('x-forwarded-for');
  const forwarded = xff?.split(',')[0]?.trim();

  // Oak also exposes request.ip, but keep a safe fallback.
  // deno-lint-ignore no-explicit-any
  const oakIp = (ctx.request as any).ip as string | undefined;

  return forwarded || oakIp || 'unknown';
};

const isRateLimited = (key: string, limit: number, windowMs: number): boolean => {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || now >= current.resetAt) {
    buckets.set(key, { resetAt: now + windowMs, count: 1 });

    return false;
  }

  current.count += 1;
  return current.count > limit;
};

const shouldBlockPath = (pathname: string): boolean => {
  if (blockedFileExtensions.test(pathname)) {
    return true;
  }

  return blockedPathPatterns.some((re) => re.test(pathname));
};

export const botShield = async (ctx: Context, next: () => Promise<unknown>): Promise<void> => {
  const pathname = ctx.request.url.pathname;

  if (shouldBlockPath(pathname)) {
    ctx.state.shield = { blocked: true, reason: 'denylist' };
    ctx.response.status = 404;

    return;
  }

  // Best-effort rate limiting. This is per isolate/instance on Deno Deploy.
  const ip = getClientIp(ctx);
  const key = `${ip}`;

  if (ip !== 'unknown' && isRateLimited(key, 180, 60_000)) {
    ctx.state.shield = { blocked: true, reason: 'rate-limit' };
    ctx.response.status = 429;
    ctx.response.headers.set('Retry-After', '60');
    ctx.response.type = 'text/plain';
    ctx.response.body = 'Too Many Requests';

    return;
  }

  await next();
};
