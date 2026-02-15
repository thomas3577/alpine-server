# @dx/alpine-server

[![JSR Version](https://jsr.io/badges/@dx/alpine-server)](https://jsr.io/@dx/alpine-server)
[![JSR Score](https://jsr.io/badges/@dx/alpine-server/score)](https://jsr.io/@dx/alpine-server/score)
[![ci](https://github.com/thomas3577/alpine-server/actions/workflows/deno.yml/badge.svg)](https://github.com/thomas3577/alpine-server/actions/workflows/deno.yml)

> ⚠️ **EXPERIMENTAL**: This library is in early development and highly experimental. APIs may change without notice. Not recommended for production use.

A secure, production-ready Oak (Deno) web server optimized for serving Alpine.js applications with built-in development tools, security hardening, and automatic hot-reloading.

## Versions

- **Oak**: v17.2.0
- **Alpine.js**: v3.15.8 (default configuration)

## Example

```typescript
import { AlpineApp } from '@dx/alpine-server';

const app = new AlpineApp({
  app: {
    dev: true,
    staticFilesPath: './public',
  },
  oak: {
    listenOptions: { port: 3000 },
  },
});

await app.run();
```

## CLI

Create a new Alpine Server project scaffold:

```sh
deno run -A jsr:@dx/alpine-server/cli new my-app
```

With options:

```sh
deno run -A jsr:@dx/alpine-server/cli new my-app --port 3000 --force
```

## Documentation

For more detailed information, please refer to the documentation in the [docs](./docs) folder:

- [Usage](./docs/USAGE.md)
- [Configuration](./docs/CONFIGURATION.md)

## License

MIT

## Contributing

Contributions welcome!
