import type { AlpineAppRuntimeConfig } from './types.ts';

import { isAbsolute, join, normalize } from '@std/path';

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

    const candidate = typeof raw.staticFilesPath === 'string' ? raw.staticFilesPath.trim() : '';
    const resolved = candidate ? (isAbsolute(candidate) ? candidate : join(Deno.cwd(), candidate)) : defaultStaticFilesPath;
    this.staticFilesPath = normalize(resolved);

    this.#internal = Object.freeze({ createdAt: Date.now() });
  }

  public get internal(): Readonly<RuntimeConfigInternal> {
    return this.#internal;
  }
}
