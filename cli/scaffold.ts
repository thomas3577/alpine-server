import { basename, dirname, join, resolve } from '@std/path';

import denoConfig from '../deno.json' with { type: 'json' };

export interface CreateProjectOptions {
  targetDir: string;
  projectName: string;
  port: number;
  force: boolean;
}

export interface AddPageOptions {
  pageName: string;
  force: boolean;
}

export interface ParsedCliArgs {
  command: 'new' | 'help' | 'add';
  targetDir: string;
  port: number;
  force: boolean;
  pageName: string;
}

type ScaffoldFileContent = string | Uint8Array;

const VALID_PAGE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const HELP_TEXT = `alpine-server CLI (alp)

Usage:
  alp new <project-name> [options]
  alp add <page-name> [options]

Commands:
  new <project-name>   Create a new alpine-server project
  add <page-name>      Add a new page to the current project

Options:
  --port <number>   Server port in app.ts (default: 8000, only for new)
  --force           Overwrite existing files
  -h, --help        Show this help message
`;

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

const PAGE_INDEX_HTML_TEMPLATE = (pageName: string) => {
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

export const getHelpText = (): string => HELP_TEXT;

const parseOptions = (rest: string[], startIndex: number): { port: number; force: boolean } => {
  let port = 8000;
  let force = false;

  for (let index = startIndex; index < rest.length; index += 1) {
    const token = rest[index];

    if (token === '--force') {
      force = true;
      continue;
    }

    if (token === '--port') {
      const value = rest[index + 1];
      if (!value) {
        throw new Error('Missing value for --port');
      }
      const parsedPort = Number.parseInt(value, 10);
      if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
        throw new Error(`Invalid port: ${value}`);
      }
      port = parsedPort;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${token}`);
  }

  return { port, force };
};

export const parseCliArgs = (args: string[]): ParsedCliArgs => {
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    return { command: 'help', targetDir: '', port: 8000, force: false, pageName: '' };
  }

  const [command, ...rest] = args;

  if (command === 'new') {
    const targetDir = rest[0];
    if (!targetDir || targetDir.startsWith('-')) {
      throw new Error('Missing required <project-name> argument for new command');
    }

    const { port, force } = parseOptions(rest, 1);

    return { command: 'new', targetDir, port, force, pageName: '' };
  }

  if (command === 'add') {
    const pageName = rest[0];
    if (!pageName || pageName.startsWith('-')) {
      throw new Error('Missing required <page-name> argument for add command');
    }

    if (!VALID_PAGE_NAME.test(pageName)) {
      throw new Error(`Invalid page name: ${pageName}. Use lowercase letters, numbers, and hyphens only.`);
    }

    const { force } = parseOptions(rest, 1);

    return { command: 'add', targetDir: '', port: 8000, force, pageName };
  }

  throw new Error(`Unknown command: ${command}`);
};

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

const isDirectoryEmpty = async (directory: string): Promise<boolean> => {
  try {
    for await (const _entry of Deno.readDir(directory)) {
      return false;
    }
    return true;
  } catch (_error) {
    return true;
  }
};

const ensureTargetDir = async (targetDir: string, force: boolean): Promise<void> => {
  const hasDirectory = await isDirectoryEmpty(targetDir);

  if (!hasDirectory && !force) {
    throw new Error('Target directory is not empty. Use --force to continue.');
  }

  await Deno.mkdir(targetDir, { recursive: true });
};

const directoryExists = async (path: string): Promise<boolean> => {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch (_error) {
    return false;
  }
};

export const createProject = async (options: CreateProjectOptions): Promise<string[]> => {
  const targetDir = resolve(options.targetDir);
  const projectName = options.projectName.trim() || basename(targetDir);

  await ensureTargetDir(targetDir, options.force);

  const files = buildScaffoldFiles(projectName, options.port);
  const writtenFiles: string[] = [];

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(targetDir, relativePath);
    await Deno.mkdir(dirname(absolutePath), { recursive: true });
    if (content instanceof Uint8Array) {
      await Deno.writeFile(absolutePath, content);
    } else {
      await Deno.writeTextFile(absolutePath, content);
    }
    writtenFiles.push(absolutePath);
  }

  return writtenFiles;
};

export const addPage = async (options: AddPageOptions): Promise<string[]> => {
  const publicDir = resolve('public');

  if (!(await directoryExists(publicDir))) {
    throw new Error('No public/ directory found. Are you in an alpine-server project?');
  }

  const pageDir = join(publicDir, options.pageName);

  if ((await directoryExists(pageDir)) && !options.force) {
    throw new Error(`Page "${options.pageName}" already exists. Use --force to overwrite.`);
  }

  await Deno.mkdir(pageDir, { recursive: true });

  const files = buildPageFiles(options.pageName);
  const writtenFiles: string[] = [];

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(pageDir, relativePath);
    await Deno.writeTextFile(absolutePath, content);
    writtenFiles.push(absolutePath);
  }

  return writtenFiles;
};
