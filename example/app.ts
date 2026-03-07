import { AlpineApp } from '../src/app.ts';

const app = new AlpineApp({
  app: {
    dev: true,
  },
  oak: {
    listenOptions: {
      port: 8000,
    },
  },
});

console.log(`URL: http://localhost:8000`);

await app.run();
