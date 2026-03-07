import denoConfig from '../deno.json' with { type: 'json' };

import type { ParsedCliArgs } from './types.ts';

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
  -v, --version     Show version number
`;

export const getHelpText = (): string => HELP_TEXT;

export const getVersion = (): string => denoConfig.version;

const parseOptions = (
  rest: string[],
  startIndex: number,
  allowedOptions: Set<string>,
): { port: number; force: boolean } => {
  let port = 8000;
  let force = false;

  for (let index = startIndex; index < rest.length; index += 1) {
    const token = rest[index];

    if (token === '--force' && allowedOptions.has('force')) {
      force = true;
      continue;
    }

    if (token === '--port' && allowedOptions.has('port')) {
      const value = rest[index + 1];
      if (!value) {
        throw new Error('Missing value for --port');
      }

      if (!/^\d+$/.test(value)) {
        throw new Error(`Invalid port: ${value}`);
      }

      const parsedPort = Number.parseInt(value, 10);
      if (parsedPort <= 0 || parsedPort > 65535) {
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
  if (args.includes('-v') || args.includes('--version') || args[0] === 'version') {
    return { command: 'version' };
  }

  if (args.length === 0 || args.includes('-h') || args.includes('--help') || args[0] === 'help') {
    return { command: 'help' };
  }

  const [command, ...rest] = args;

  if (command === 'new') {
    const targetDir = rest[0];
    if (!targetDir || targetDir.startsWith('-')) {
      throw new Error('Missing required <project-name> argument for new command');
    }

    const { port, force } = parseOptions(rest, 1, new Set(['port', 'force']));

    return { command: 'new', targetDir, port, force };
  }

  if (command === 'add') {
    const pageName = rest[0];
    if (!pageName || pageName.startsWith('-')) {
      throw new Error('Missing required <page-name> argument for add command');
    }

    if (!VALID_PAGE_NAME.test(pageName)) {
      throw new Error(`Invalid page name: ${pageName}. Use lowercase letters, numbers, and hyphens only.`);
    }

    const { force } = parseOptions(rest, 1, new Set(['force']));

    return { command: 'add', pageName, force };
  }

  throw new Error(`Unknown command: ${command}`);
};
