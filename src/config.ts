import { join } from '@std/path';
import { resolveStaticFilesPath } from './utils.ts';

import type { AlpineAppRuntimeConfig, IRuntimeConfig, IVendors } from './types.ts';

const defaultStaticFilesPath = join(Deno.cwd(), 'public');

const defaultStaticExtensions: string[] = ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt', '.woff2', '.woff', '.ttf'];

const defaultVendors: Record<string, string> = {
  'alpinejs.mjs': `https://esm.sh/alpinejs@3.15.8/es2024/alpinejs.mjs`,
};

/** Filename of the updater bundle exposed by the updater route. */
export const UPDATER_FILENAME = 'updater.js';

/**
 * Normalizes and stores runtime configuration used by middleware and routes.
 */
export class RuntimeConfig implements IRuntimeConfig {
  readonly dev: boolean;
  readonly staticFilesPath: string;
  readonly production: boolean;
  readonly staticExtensions: string[];
  readonly vendors: IVendors;
  readonly updaterFilename: string = UPDATER_FILENAME;

  /**
   * Creates runtime config from user input, applying defaults and validation.
   *
   * @param {Partial<AlpineAppRuntimeConfig> | undefined} input Optional partial runtime configuration.
   */
  constructor(input: Partial<AlpineAppRuntimeConfig> | undefined) {
    const raw = (input && typeof input === 'object') ? input : {};

    this.dev = Boolean(raw.dev);
    this.production = !this.dev;
    this.vendors = {
      map: {
        ...defaultVendors,
        ...(raw.vendors?.map ?? {}),
      },
      route: raw.vendors?.route ?? '/',
    };
    this.staticFilesPath = resolveStaticFilesPath(raw.staticFilesPath, defaultStaticFilesPath);
    this.staticExtensions = Array.isArray(raw.staticExtensions) && raw.staticExtensions.every((ext) => typeof ext === 'string') ? raw.staticExtensions : defaultStaticExtensions;
  }
}
