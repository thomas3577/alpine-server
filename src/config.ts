import { join } from '@std/path';
import { resolveStaticFilesPath } from './utils.ts';

import type { AlpineAppRuntimeConfig, IRuntimeConfig } from './types.ts';

const defaultStaticFilesPath = join(Deno.cwd(), 'public');

const defaultStaticExtensions: string[] = ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt'];

const defaultVendors: Record<string, string> = {
  '/alpinejs.mjs': `https://esm.sh/alpinejs@3.15.8/es2024/alpinejs.mjs`,
  '/alpinejs.mjs.map': `https://esm.sh/alpinejs@3.15.8/es2024/alpinejs.mjs.map`,
};

export const updaterFilename = 'updater.js';

export class RuntimeConfig implements IRuntimeConfig {
  readonly dev: boolean;
  readonly staticFilesPath: string;
  readonly production: boolean;
  readonly staticExtensions: string[];
  readonly vendors: Record<string, string>;
  readonly updaterFilename: string = updaterFilename;

  constructor(input: Partial<AlpineAppRuntimeConfig> | undefined) {
    const raw = (input && typeof input === 'object') ? input : {};

    this.dev = Boolean(raw.dev);
    this.production = !this.dev;
    this.vendors = { ...defaultVendors, ...raw.vendors };
    this.staticFilesPath = resolveStaticFilesPath(raw.staticFilesPath, defaultStaticFilesPath);
    this.staticExtensions = Array.isArray(raw.staticExtensions) && raw.staticExtensions.every((ext) => typeof ext === 'string') ? raw.staticExtensions : defaultStaticExtensions;
  }
}
