import type { IRuntimeConfig } from '../types.ts';

export type { IRuntimeConfig };

export const createRuntimeConfig = (dev: boolean, staticFilesPath: string): IRuntimeConfig => ({
  dev,
  production: !dev,
  staticFilesPath,
  staticExtensions: ['.html', '.css', '.js'],
  vendors: { map: {}, route: '/' },
});
