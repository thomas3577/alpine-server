import { Application } from '@oak/oak';
import type { Middleware, Router } from '@oak/oak';
import { staticFiles } from './middleware/static-files.ts';
import { errorHandler } from './middleware/error-handler.ts';
import { logger } from './middleware/logger.ts';
import { timing } from './middleware/timing.ts';
import { securityHeaders } from './middleware/security-headers.ts';
import { staticFileWatch } from './services/sse.ts';
import { createVendorRouter } from './middleware/vendor.ts';
import { RuntimeConfig } from './config.ts';
import { router as updater } from './routes/updater.ts';
import { router as sse } from './routes/sse.ts';
import { router as view } from './routes/views.ts';
import type { AlpineAppConfig, AlpineAppState } from './types.ts';

/**
 * AlpineApp is a web application framework built on top of Oak,
 * providing a streamlined setup with built-in middleware for security,
 * logging, static files, and more.
 *
 * @example
 * ```ts
 * const app = new AlpineApp({ oak: { listenOptions: { port: 8000 } } });
 * app.use(myMiddleware);
 * app.append(myRouter);
 * await app.run();
 * ```
 */
export class AlpineApp {
  readonly #app: Application<AlpineAppState>;
  readonly #config: AlpineAppConfig;
  readonly #userMiddlewares: Middleware<AlpineAppState>[] = [];
  readonly #userRouters: Router[] = [];
  #running = false;

  /**
   * Creates a new AlpineApp instance.
   *
   * @param {AlpineAppConfig | undefined} config - Configuration for the application and Oak server
   */
  constructor(config?: AlpineAppConfig) {
    this.#app = new Application<AlpineAppState>();
    this.#config = config ?? {};
  }

  /**
   * Registers a middleware function that will be executed after system
   * middlewares but before routes.
   *
   * @param {Middleware<AlpineAppState>} middleware - Middleware function to register
   * @returns {this} The AlpineApp instance for method chaining
   *
   * @example
   * ```ts
   * app.use(async (ctx, next) => {
   *   console.log('Custom middleware');
   *   await next();
   * });
   * ```
   */
  use(middleware: Middleware<AlpineAppState>): this {
    this.#userMiddlewares.push(middleware);

    return this;
  }

  /**
   * Appends a router to the application. Routes will be registered after
   * all middlewares but before internal routes (updater, static files, etc.).
   *
   * @param {Router} router - Oak Router instance to append
   * @returns {this} The AlpineApp instance for method chaining
   *
   * @example
   * ```ts
   * const router = new Router();
   * router.get('/api/users', getUsers);
   * app.append(router);
   * ```
   */
  append(router: Router): this {
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

    this.#app.use(async (ctx, next) => {
      ctx.state.config = runtime;

      await next();
    });

    this.#app.use(errorHandler);
    this.#app.use(logger);
    this.#app.use(timing);
    this.#app.use(securityHeaders);
    this.#app.use(createVendorRouter(runtime.vendors).routes());

    // User middlewares
    for (const middleware of this.#userMiddlewares) {
      this.#app.use(middleware);
    }

    // User routes
    for (const router of this.#userRouters) {
      this.#app.use(router.routes());
    }

    this.#app.use(updater.routes());
    this.#app.use(staticFiles);
    this.#app.use(sse.routes());
    this.#app.use(view.routes());

    if (runtime.dev) {
      staticFileWatch(runtime.staticFilesPath);
    }

    await this.#app.listen(this.#config.oak?.listenOptions);
  }
}
