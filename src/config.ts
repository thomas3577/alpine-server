import { join } from '@std/path';
import { resolveStaticFilesPath } from './utils.ts';

import type { AlpineAppRuntimeConfig, IRuntimeConfig, Vendor } from './types.ts';

const defaultStaticFilesPath = join(Deno.cwd(), 'public');

const defaultStaticExtensions: string[] = ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt'];

const alpinejsVersion = '3.15.8';
const alpinejsCdnBase = `https://esm.sh/alpinejs@${alpinejsVersion}/es2024`;

const defaultVendors: Record<string, Vendor> = {
  '/alpinejs.mjs': {
    url: `${alpinejsCdnBase}/alpinejs.mjs`,
    type: 'application/javascript; charset=utf-8;',
  },
  '/alpinejs.mjs.map': {
    url: `${alpinejsCdnBase}/alpinejs.mjs.map`,
    type: 'application/json; charset=utf-8;',
  },
};

export class RuntimeConfig implements IRuntimeConfig {
  public readonly dev: boolean;
  public readonly staticFilesPath: string;
  public readonly production: boolean;
  public readonly staticExtensions: string[];
  public readonly vendors: Record<string, Vendor>;

  constructor(input: Partial<AlpineAppRuntimeConfig> | undefined) {
    const raw = (input && typeof input === 'object') ? input : {};

    this.dev = Boolean(raw.dev);
    this.production = !this.dev;
    this.vendors = defaultVendors;
    this.staticFilesPath = resolveStaticFilesPath(raw.staticFilesPath, defaultStaticFilesPath);
    this.staticExtensions = Array.isArray(raw.staticExtensions) && raw.staticExtensions.every((ext) => typeof ext === 'string') ? raw.staticExtensions : defaultStaticExtensions;
  }
}
