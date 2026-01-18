import type { Context } from '@oak/oak';

import { isHttpError } from '@oak/oak';
import * as log from '@std/log';

import type { AlpineAppState } from '../types.ts';

export const errorHandler = async (ctx: Context<AlpineAppState>, next: () => Promise<unknown>): Promise<void> => {
  try {
    await next();
  } catch (err) {
    if (isHttpError(err)) {
      const { response } = ctx;

      response.status = err.status;

      const { message, status, stack } = err;
      const includeStack = ctx.state.config.dev;

      if (ctx.request.accepts('json')) {
        response.body = includeStack ? { message, status, stack } : { message, status };
        response.type = 'json';
      } else {
        response.body = includeStack ? `${status} ${message}\n\n${stack ?? ''}` : `${status} ${message}`;
        response.type = 'text/plain';
      }
    } else if (err instanceof Deno.errors.NotFound) {
      // Avoid crashing/logging on benign filesystem probes.
      ctx.response.status = 404;
      ctx.response.type = 'text/plain';
      ctx.response.body = 'Not Found';
    } else {
      log.error(err);
      ctx.response.status = 500;
      ctx.response.type = 'text/plain';
      ctx.response.body = ctx.state.config.dev ? `Internal Server Error\n\n${String(err)}` : 'Internal Server Error';
    }
  }
};
