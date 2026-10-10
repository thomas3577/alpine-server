/**
 * Listen options for the HTTP server, honored on Deno, Node.js, and Bun.
 */
export type ListenOptions = {
  /** Port to listen on (default: 8000; 0 picks a free port) */
  port?: number;
  /** Hostname to bind to (default: '0.0.0.0') */
  hostname?: string;
  /** Aborting this signal shuts the server down and lets `run()` resolve */
  signal?: AbortSignal;
  /** Called once the server is listening, with the bound address */
  onListen?: (addr: { hostname: string; port: number }) => void;
};

/**
 * Configuration options for the underlying HTTP server.
 */
export type ServerModuleConfig = {
  /** Listen options (port, hostname, signal, onListen) */
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
  vendors?: IVendors;
};

/**
 * Vendor configuration mapping vendor names to their CDN URLs and route.
 */
export interface IVendors {
  /** Map of vendor names to their CDN URLs (e.g., { 'jquery': 'https://cdn.example.com/jquery.min.js' }) */
  map: Record<string, string>;
  /** Route prefix for serving vendor files (e.g., '/vendor'). Defaults to '/' if not specified. */
  route?: string;
}

/**
 * Complete runtime configuration interface including computed properties.
 */
export interface IRuntimeConfig extends AlpineAppRuntimeConfig {
  /** Whether the application is running in production mode (inverse of dev) */
  production: boolean;
  /** Map of vendor names to their configurations */
  vendors: IVendors;
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
 *   server: {
 *     listenOptions: { port: 8000 }
 *   }
 * };
 * ```
 */
export type AlpineAppConfig = {
  /** Application-specific configuration */
  app?: Partial<AlpineAppRuntimeConfig>;
  /** Server configuration */
  server?: ServerModuleConfig;
};

/**
 * State object available in Hono context variables (`c.get(...)`/`c.set(...)`).
 */
export type AlpineAppState = {
  /** Runtime configuration accessible throughout the request lifecycle */
  config: IRuntimeConfig;
};
