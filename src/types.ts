import type { ListenOptions } from '@oak/oak/application';

export type Dictionary<T> = { [key: string]: T };

export type OakModuleConfig = {
  listenOptions?: ListenOptions;
};

// User-provided config (may be partial).
export type AlpineAppRuntimeConfigInput = {
  dev?: boolean;
  staticFilesPath?: string;
};

// Resolved runtime config after applying defaults/normalization.
export type AlpineAppRuntimeConfig = {
  dev: boolean;
  production: boolean;
  staticFilesPath: string;
};

export type AlpineAppConfig = {
  app?: AlpineAppRuntimeConfigInput;
  oak?: OakModuleConfig;
};

export type AlpineAppState = {
  config: AlpineAppRuntimeConfig;
};
