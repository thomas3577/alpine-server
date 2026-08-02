import { Hono } from '@hono/hono';
import type { MiddlewareHandler } from '@hono/hono';
import { info } from '@std/log';
import { staticFiles } from './middleware/static-files.ts';
import { errorHandler } from './middleware/error-handler.ts';
import { logger } from './middleware/logger.ts';
import { timing } from './middleware/timing.ts';
import { securityHeaders } from './middleware/security-headers.ts';
import { staticFileWatch } from './services/sse.ts';
import { createVendorRouter } from './middleware/vendor.ts';
import { RuntimeConfig, UPDATER_FILENAME } from './config.ts';
import { router as updater } from './routes/updater.ts';
import { router as sse } from './routes/sse.ts';
import { router as view } from './routes/views.ts';
import type { AlpineAppConfig, AlpineAppState } from './types.ts';

type AppEnv = { Variables: AlpineAppState };

/**
 * AlpineApp is a web application framework built on top of Hono,
 * providing a streamlined setup with built-in middleware for security,
 * logging, static files, and more.
 *
 * @example
 * ```ts
 * const app = new AlpineApp({ server: { listenOptions: { port: 8000 } } });
 * app.use(myMiddleware);
 * app.append(myRouter);
 * await app.run();
 * ```
 */
export class AlpineApp {
  readonly #app: Hono<AppEnv>;
  readonly #config: AlpineAppConfig;
  readonly #userMiddlewares: MiddlewareHandler<AppEnv>[] = [];
  readonly #userRouters: Hono<AppEnv>[] = [];
  #running = false;

  /**
   * Creates a new AlpineApp instance.
   *
   * @param {AlpineAppConfig | undefined} config - Configuration for the application and the underlying server
   */
  constructor(config?: AlpineAppConfig) {
    this.#app = new Hono<AppEnv>();
    this.#config = config ?? {};
  }

  /**
   * Registers a middleware function that will be executed after system
   * middlewares but before routes.
   *
   * @param {MiddlewareHandler<AppEnv>} middleware - Middleware function to register
   * @returns {this} The AlpineApp instance for method chaining
   *
   * @example
   * ```ts
   * app.use(async (c, next) => {
   *   console.log('Custom middleware');
   *   await next();
   * });
   * ```
   */
  use(middleware: MiddlewareHandler<AppEnv>): this {
    this.#userMiddlewares.push(middleware);

    return this;
  }

  /**
   * Appends a sub-app to the application. Routes will be registered after
   * all middlewares but before internal routes (updater, static files, etc.).
   *
   * @param {Hono<AppEnv>} router - Hono instance mounted at the root
   * @returns {this} The AlpineApp instance for method chaining
   *
   * @example
   * ```ts
   * const router = new Hono();
   * router.get('/api/users', getUsers);
   * app.append(router);
   * ```
   */
  append(router: Hono<AppEnv>): this {
    this.#userRouters.push(router);

    return this;
  }

  /**
   * Starts the application server and registers all middlewares and routes.
   * This method can only be called once per instance.
   *
   * @throws {Error} If the application is already running
   *
   * @example
   * ```ts
   * await app.run();
   * console.log('Server running on port 8000');
   * ```
   */
  async run(): Promise<void> {
    if (this.#running) {
      throw new Error('AlpineApp is already running');
    }

    this.#running = true;

    const runtime = new RuntimeConfig(this.#config.app);

    this.#app.use(async (c, next) => {
      c.set('config', runtime);

      await next();
    });

    this.#app.onError(errorHandler);
    this.#app.use(logger);
    this.#app.use(timing);
    this.#app.use(securityHeaders);
    this.#app.route(runtime.vendors.route ?? '/', createVendorRouter());

    // User middlewares
    for (const middleware of this.#userMiddlewares) {
      this.#app.use(middleware);
    }

    // User routers
    for (const router of this.#userRouters) {
      this.#app.route('/', router);
    }

    // Mounted at both forms so `/updater.js` and `/updater.js/` resolve identically.
    this.#app.route(`/${UPDATER_FILENAME}`, updater);
    this.#app.route(`/${UPDATER_FILENAME}/`, updater);
    this.#app.use(staticFiles);
    this.#app.route('/sse', sse);
    this.#app.route('/', view);

    if (runtime.dev) {
      staticFileWatch(runtime.staticFilesPath);
    }

    info('Starting...');

    await Deno.serve(this.#config.server?.listenOptions ?? {}, this.#app.fetch).finished;
  }
}
