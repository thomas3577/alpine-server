import { join } from '@std/path';
import { resolveStaticFilesPath } from './utils.ts';

import type { AlpineAppRuntimeConfig } from './types.ts';

type RuntimeConfigInternal = {
  createdAt: number;
};

export const defaultStaticFilesPath = join(Deno.cwd(), 'static');

export class RuntimeConfig implements AlpineAppRuntimeConfig {
  public readonly dev: boolean;
  public readonly staticFilesPath: string;

  /**
   * Internal values that must not be user-overridable.
   * Keep these out of AlpineAppRuntimeConfig on purpose.
   */
  readonly #internal: Readonly<RuntimeConfigInternal>;

  /** Derived, non-overridable convenience flag. */
  public readonly production: boolean;

  constructor(input: unknown) {
    // Whitelist only the keys we allow from the outside.
    const raw = (input && typeof input === 'object') ? (input as Record<string, unknown>) : {};

    this.dev = Boolean(raw.dev);
    this.production = !this.dev;
    this.staticFilesPath = resolveStaticFilesPath(raw.staticFilesPath, defaultStaticFilesPath);

    this.#internal = Object.freeze({ createdAt: Date.now() });
  }

  public get internal(): Readonly<RuntimeConfigInternal> {
    return this.#internal;
  }
}
