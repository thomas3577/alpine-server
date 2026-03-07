import { join } from '@std/path';

import denoConfig from '../deno.json' with { type: 'json' };

import type { ScaffoldFileContent } from './types.ts';

const MAIN_TS_TEMPLATE = (port: number) =>
  `import { AlpineApp } from '@dx/alpine-server';

const app = new AlpineApp({
  app: {
    dev: true,
    staticFilesPath: './public',
  },
  oak: {
    listenOptions: { port: ${port} },
  },
});

console.log('URL: http://localhost:${port}');

await app.run();
`;

const INDEX_HTML_TEMPLATE = (projectName: string) =>
  `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <link rel="icon" type="image/png" href="favicon.png">
    <link rel="stylesheet" href="style.css">
    <script defer type="module" src="main.js"></script>
  </head>
  <body x-data="counterApp">
    <main>
      <h1>${projectName}</h1>
      <p>Count: <span x-text="count"></span></p>
      <button @click="increment">Increment</button>
    </main>
  </body>
</html>
`;

export const PAGE_INDEX_HTML_TEMPLATE = (pageName: string) => {
  const title = pageName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="stylesheet" href="/style.css">
    <script defer type="module" src="/main.js"></script>
  </head>
  <body x-data="{ }">
    <main>
      <h1>${title}</h1>
      <p><a href="/">Home</a></p>
    </main>
  </body>
</html>
`;
};

const FAVICON_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACPTkDJAAACLklEQVRYCe1UQUsbURB+72Uj2iIi4kH6G+JazKpUU+Oa0pZCoYgHDz148dCLh170IF1vOQjtTfBmL4JexUokFXNJYtqi6aUohWLx4EG9WLVEM85ENmyeu5v1/gaStzPzzftmvzf7GFOmFFAKKAU8FNANc7zTMJe6JybCHpBA4amtnxb9vMDcLdFpDE8ClD9ijqN9eai1jWSzKxduWL8YEQODD4ThjM8mByOWjBdyQDeGZpD8U6UG/wDg5b+r4/X+/tfNMtbPd5ITjhpxU6JGAZR8Dgnfu27M2bcmLl5sb6ePXfOOoEzuSN1RoqKAZVkCyRc8yWkHYNFLgK3u2PMO54bysx/57Ta1SvB43NJOzjKfUaIxeTN3n/8OaQ2Jndz6Hzlfj9yJt2eCRwxzGQ961Jms94yDeRjWtMT3bOqXjb0PuV1DTQgh+DwGzuxgkBWP6lGpVMro0cTjIHg/jNjNpze5Fk7gdJz6AeUcMNYOrLzZZZhPKEefGL2RjPPy7SOoDGExl8qHhYjjV3/kVeAWx7lpKQPb6Oodfkb5oE3Y5FRTvQd+5NPFkAjF8Mo4oERQwyYeXF/Dqt5jvqGaek04yQlfbYCcnfzGfiPXBnDI9sgPbtAAwFb0qPmWaryakMkJW9MABQqF1N8mwZ+iEkXygxoOZqjMYBGv8XdUIzfhRk64mpuQArZFBl618v/na/hmfXYs6Co4n94tfE0Snj5PWqkhWpUpBZQCSgGlgKzADRwQ0F0sf3NzAAAAAElFTkSuQmCC';

const FAVICON_PNG_TEMPLATE = Uint8Array.from(atob(FAVICON_PNG_BASE64), (char) => char.charCodeAt(0));

const MAIN_JS_TEMPLATE = `import Alpine from '/alpinejs.mjs';

window.Alpine = Alpine;

Alpine.data('counterApp', () => ({
  count: 0,
  increment() {
    this.count += 1;
  },
}));

Alpine.start();
`;

const STYLE_CSS_TEMPLATE = `:root {
  color-scheme: light dark;
  font-family: Inter, system-ui, sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
}

main {
  width: min(32rem, 90vw);
  text-align: center;
}

button {
  font: inherit;
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid currentColor;
  cursor: pointer;
}
`;

const README_TEMPLATE = (projectName: string) =>
  `# ${projectName}

Created with @dx/alpine-server CLI.

## Run

\`deno run --allow-net --allow-read --allow-write --allow-env --watch app.ts\`
`;

const DENO_JSON_TEMPLATE = `{
  "tasks": {
    "dev": "deno run --allow-net --allow-read --allow-write --allow-env --watch app.ts",
    "alp": "deno run -A jsr:@dx/alpine-server/cli"
  },
  "imports": {
    "@dx/alpine-server": "jsr:@dx/alpine-server@${denoConfig.version}"
  }
}
`;

const VSCODE_SETTINGS_TEMPLATE = `{
  "deno.enable": true,
  "deno.lint": true,
  "deno.enablePaths": ["."]
}
`;

const VSCODE_LAUNCH_TEMPLATE = (port: number) =>
  `{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run app",
      "type": "node",
      "request": "launch",
      "cwd": "\${workspaceFolder}",
      "cascadeTerminateToConfigurations": [
        "client"
      ],
      "runtimeExecutable": "deno",
      "runtimeArgs": [
        "run",
        "--inspect-wait=127.0.0.1:9229",
        "--allow-net",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        "--watch",
        "app.ts"
      ],
      "attachSimplePort": 9229,
      "console": "integratedTerminal",
      "serverReadyAction": {
        "action": "startDebugging",
        "pattern": "Starting...",
        "name": "Open client"
      }
    },
    {
      "name": "Open client",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:${port}"
    }
  ]
}
`;

export const buildScaffoldFiles = (projectName: string, port: number): Record<string, ScaffoldFileContent> => ({
  'deno.json': DENO_JSON_TEMPLATE,
  'app.ts': MAIN_TS_TEMPLATE(port),
  'README.md': README_TEMPLATE(projectName),
  [join('public', 'index.html')]: INDEX_HTML_TEMPLATE(projectName),
  [join('public', 'favicon.png')]: FAVICON_PNG_TEMPLATE,
  [join('public', 'main.js')]: MAIN_JS_TEMPLATE,
  [join('public', 'style.css')]: STYLE_CSS_TEMPLATE,
  [join('.vscode', 'settings.json')]: VSCODE_SETTINGS_TEMPLATE,
  [join('.vscode', 'launch.json')]: VSCODE_LAUNCH_TEMPLATE(port),
});

export const buildPageFiles = (pageName: string): Record<string, string> => ({
  'index.html': PAGE_INDEX_HTML_TEMPLATE(pageName),
});
