import { AlpineApp } from '../src/app.ts';
import * as path from '@std/path';

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

const app = new AlpineApp({
  app: {
    dev: true,
    staticFilesPath: path.join(__dirname, 'public'),
    staticExtensions: ['.css', '.js', '.png'],
  },
  oak: {
    listenOptions: {
      port: 8000,
    },
  },
});

await app.run();
