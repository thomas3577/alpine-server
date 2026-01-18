import type { Context } from '@oak/oak';

import type { Vendor } from '../types.ts';

export const vendor = async (ctx: Context, next: () => Promise<unknown>): Promise<void> => {
  const vendor: Vendor = ctx.state.config.vendors[ctx.request.url.pathname];
  if (vendor) {
    if (!vendor.content) {
      const response: Response = await fetch(vendor.url);
      vendor.content = await response.text();
    }

    ctx.response.headers.append('content-type', vendor.type);
    ctx.response.body = vendor.content;
  } else {
    await next();
  }
};
