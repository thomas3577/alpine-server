/** Default runtime configuration, static file settings, and vendor CDN map. */
import { join } from '@std/path';
import { resolveStaticFilesPath } from './utils.ts';
import type { AlpineAppRuntimeConfig, IRuntimeConfig, IVendors } from './types.ts';

const defaultStaticFilesPath = join(Deno.cwd(), 'public');

const defaultStaticExtensions: string[] = ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt', '.woff2', '.woff', '.ttf'];

export const ALPINE_VERSION = '3.16.1';

const defaultVendors: Record<string, string> = {
  'alpinejs.mjs': `https://esm.sh/alpinejs@${ALPINE_VERSION}/es2024/alpinejs.mjs`,
  'alpinejs-mask.mjs': `https://esm.sh/@alpinejs/mask@${ALPINE_VERSION}/es2024/mask.mjs`,
  'alpinejs-intersect.mjs': `https://esm.sh/@alpinejs/intersect@${ALPINE_VERSION}/es2024/intersect.mjs`,
  'alpinejs-resize.mjs': `https://esm.sh/@alpinejs/resize@${ALPINE_VERSION}/es2024/resize.mjs`,
  'alpinejs-persist.mjs': `https://esm.sh/@alpinejs/persist@${ALPINE_VERSION}/es2024/persist.mjs`,
  'alpinejs-focus.mjs': `https://esm.sh/@alpinejs/focus@${ALPINE_VERSION}/es2024/focus.mjs`,
  'alpinejs-collapse.mjs': `https://esm.sh/@alpinejs/collapse@${ALPINE_VERSION}/es2024/collapse.mjs`,
  'alpinejs-anchor.mjs': `https://esm.sh/@alpinejs/anchor@${ALPINE_VERSION}/es2024/anchor.mjs`,
  'alpinejs-morph.mjs': `https://esm.sh/@alpinejs/morph@${ALPINE_VERSION}/es2024/morph.mjs`,
  'alpinejs-sort.mjs': `https://esm.sh/@alpinejs/sort@${ALPINE_VERSION}/es2024/sort.mjs`,
  'alpinejs-ui.mjs': `https://esm.sh/@alpinejs/ui@${ALPINE_VERSION}/es2024/ui.mjs`,
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
