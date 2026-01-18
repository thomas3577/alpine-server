import { Application } from '@oak/oak';

import { staticFiles } from './middleware/static-files.ts';
import { errorHandler } from './middleware/error-handler.ts';
import { logger } from './middleware/logger.ts';
import { botShield } from './middleware/bot-shield.ts';
import { timing } from './middleware/timing.ts';
import { securityHeaders } from './middleware/security-headers.ts';
import { staticFileWatch } from './services/watch.service.ts';
import { vendor } from './middleware/vendor.ts';

import { RuntimeConfig } from './config.ts';

import { router as updaterRouter } from './services/updater.service.ts';
import { router as sseRouter } from './services/sse.service.ts';

import view from './views/index.ts';

import type { AlpineAppConfig, AlpineAppState } from './types.ts';

export class AlpineApp {
  #config: AlpineAppConfig;

  constructor(config: AlpineAppConfig) {
    this.#config = config;
  }

  async run(): Promise<void> {
    const app = new Application<AlpineAppState>();
    const runtime = new RuntimeConfig(this.#config.app);

    app.use(async (ctx, next) => {
      ctx.state.config = runtime;

      await next();
    });

    app.use(logger);
    app.use(timing);
    app.use(securityHeaders);
    app.use(errorHandler);
    app.use(botShield);
    app.use(vendor);
    app.use(updaterRouter.routes());
    app.use(staticFiles);
    app.use(sseRouter.routes());
    app.use(view.routes());

    if (runtime.dev) {
      staticFileWatch(runtime.staticFilesPath);
    }

    await app.listen(this.#config.oak?.listenOptions);
  }
}
