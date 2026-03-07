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

Or with Deno 2.7+ create templates:

```sh
deno create jsr:@dx/alpine-server -- my-app
```

With options:

```sh
deno run -A jsr:@dx/alpine-server/cli new my-app --port 3000 --force
```

```sh
deno create jsr:@dx/alpine-server -- my-app --port 3000 --force
```

### Local CLI (`alp`)

After creating a project, the local CLI is available as a Deno task:

```sh
deno task alp add about
deno task alp add contact --force
```

For global usage, install with:

```sh
deno install -gA jsr:@dx/alpine-server/cli --name alp
```

Then use directly:

```sh
alp new my-app
cd my-app
alp add about
```

## Documentation

For more detailed information, please refer to the documentation in the [docs](./docs) folder:

- [Usage](./docs/USAGE.md)
- [Configuration](./docs/CONFIGURATION.md)

## License

MIT

## Contributing

Contributions welcome!
