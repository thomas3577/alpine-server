import type { Context } from '@oak/oak';

import type { Dictionary } from '../types.ts';

interface IVendor {
  url: string;
  type: string;
  content?: string;
}

const alpinejsVersion = '3.15.4';

const vendorMap: Dictionary<IVendor> = {
  '/alpinejs.mjs': {
    url: `https://esm.sh/alpinejs@${alpinejsVersion}/es2024/alpinejs.mjs`,
    type: 'application/javascript; charset=utf-8;',
  },
  '/alpinejs.mjs.map': {
    url: `https://esm.sh/alpinejs@${alpinejsVersion}/es2024/alpinejs.mjs.map`,
    type: 'application/json; charset=utf-8;',
  },
};

export const vendor = async (ctx: Context, next: () => Promise<unknown>): Promise<void> => {
  const vendor: IVendor = vendorMap[ctx.request.url.pathname];
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
