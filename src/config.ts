import { join } from '@std/path';
import { resolveStaticFilesPath } from './utils.ts';

import type { AlpineAppRuntimeConfig, IRuntimeConfig } from './types.ts';

const defaultStaticFilesPath = join(Deno.cwd(), 'static');
const defaultStaticExtensions: string[] = ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt'];

export class RuntimeConfig implements IRuntimeConfig {
  public readonly dev: boolean;
  public readonly staticFilesPath: string;
  public readonly production: boolean;
  public readonly staticExtensions: string[];

  constructor(input: Partial<AlpineAppRuntimeConfig> | undefined) {
    const raw = (input && typeof input === 'object') ? input : {};

    this.dev = Boolean(raw.dev);
    this.production = !this.dev;
    this.staticFilesPath = resolveStaticFilesPath(raw.staticFilesPath, defaultStaticFilesPath);
    this.staticExtensions = Array.isArray(raw.staticExtensions) && raw.staticExtensions.every((ext) => typeof ext === 'string')
      ? raw.staticExtensions
      : defaultStaticExtensions;
  }
}
