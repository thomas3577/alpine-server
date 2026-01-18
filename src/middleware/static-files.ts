import type { Context } from '@oak/oak';

import { send } from '@oak/oak';
import { extname } from '@std/path';

import type { AlpineAppState } from '../types.ts';

const extnames: string[] = ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt'];

export const staticFiles = async (ctx: Context<AlpineAppState>, next: () => Promise<unknown>): Promise<void> => {
  const { pathname } = ctx.request.url;

  if (extnames.includes(extname(pathname))) {
    await send(ctx, pathname, { root: ctx.state.config.staticFilesPath });
  } else {
    await next();
  }
};
