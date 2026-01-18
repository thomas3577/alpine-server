import type { ListenOptions } from '@oak/oak';

export type Vendor = {
  url: string;
  type: string;
  content?: string;
}

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
  vendors: Record<string, Vendor>;
}

export type AlpineAppConfig = {
  app?: Partial<AlpineAppRuntimeConfig>;
  oak?: OakModuleConfig;
};

export type AlpineAppState = {
  config: IRuntimeConfig;
};
