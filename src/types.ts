import type { ListenOptions } from '@oak/oak';

/**
 * Configuration options for the Oak server.
 */
export type OakModuleConfig = {
  /** Options for the Oak listen method (port, hostname, etc.) */
  listenOptions?: ListenOptions;
};

/**
 * Runtime configuration for AlpineApp.
 */
export type AlpineAppRuntimeConfig = {
  /** Whether the application is running in development mode */
  dev: boolean;
  /** Path to the directory containing static files */
  staticFilesPath: string;
  /** List of file extensions to serve as static files (e.g., ['.html', '.css', '.js']) */
  staticExtensions: string[];
  /** Optional vendor configurations to extend or override default vendors */
  vendors?: Record<string, string>;
};

/**
 * Complete runtime configuration interface including computed properties.
 */
export interface IRuntimeConfig extends AlpineAppRuntimeConfig {
  /** Whether the application is running in production mode (inverse of dev) */
  production: boolean;
  /** Map of vendor names to their configurations */
  vendors: Record<string, string>;
}

/**
 * Configuration object for creating an AlpineApp instance.
 *
 * @example
 * ```ts
 * const config: AlpineAppConfig = {
 *   app: {
 *     dev: true,
 *     staticFilesPath: './public',
 *     staticExtensions: ['.html', '.css', '.js']
 *   },
 *   oak: {
 *     listenOptions: { port: 8000 }
 *   }
 * };
 * ```
 */
export type AlpineAppConfig = {
  /** Application-specific configuration */
  app?: Partial<AlpineAppRuntimeConfig>;
  /** Oak server configuration */
  oak?: OakModuleConfig;
};

/**
 * State object available in Oak context (`ctx.state`).
 */
export type AlpineAppState = {
  /** Runtime configuration accessible throughout the request lifecycle */
  config: IRuntimeConfig;
};
