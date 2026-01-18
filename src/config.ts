import { join } from '@std/path';
import { resolveStaticFilesPath } from './utils.ts';

import type { AlpineAppRuntimeConfig, IRuntimeConfig } from './types.ts';

const defaultStaticFilesPath = join(Deno.cwd(), 'static');

export class RuntimeConfig implements IRuntimeConfig {
  public readonly dev: boolean;
  public readonly staticFilesPath: string;
  public readonly production: boolean;

  constructor(input: Partial<AlpineAppRuntimeConfig> | undefined) {
    const raw = (input && typeof input === 'object') ? input : {};

    this.dev = Boolean(raw.dev);
    this.production = !this.dev;
    this.staticFilesPath = resolveStaticFilesPath(raw.staticFilesPath, defaultStaticFilesPath);
  }
}
