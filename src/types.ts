import type { ListenOptions } from '@oak/oak';

export type Dictionary<T> = { [key: string]: T };

export type OakModuleConfig = {
  listenOptions?: ListenOptions;
};

export type AlpineAppRuntimeConfig = {
  dev: boolean;
  staticFilesPath: string;
  staticExtensions: string[];
};

export interface IRuntimeConfig extends AlpineAppRuntimeConfig {
  production: boolean;
}

export type AlpineAppConfig = {
  app?: Partial<AlpineAppRuntimeConfig>;
  oak?: OakModuleConfig;
};

export type AlpineAppState = {
  config: IRuntimeConfig;
};
