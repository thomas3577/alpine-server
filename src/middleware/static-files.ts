import type { Context } from '@oak/oak';
import { send } from '@oak/oak';
import { extname } from '@std/path';
import type { AlpineAppState } from '../types.ts';

/**
 * Serves files with allowed extensions from the configured static root.
 */
export const staticFiles = async (ctx: Context<AlpineAppState>, next: () => Promise<unknown>): Promise<void> => {
  const { pathname } = ctx.request.url;

  if (ctx.state.config.staticExtensions.includes(extname(pathname))) {
    await send(ctx, pathname, { root: ctx.state.config.staticFilesPath });
  } else {
    await next();
  }
};
