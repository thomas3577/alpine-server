/**
 * Convenience CLI entrypoint for creating a new alpine-server project.
 *
 * Runs the scaffold command in `new` mode and supports the same
 * target directory and option handling as the main CLI.
 */
import { basename, resolve } from '@std/path';

import { createProject, getHelpText, parseCliArgs } from './src/scaffold.ts';

const CREATE_HELP_TEXT = `alpine-server template

Usage:
  deno create jsr:@dx/alpine-server -- <project-name> [options]

Options:
  --port <number>   Server port in main.ts (default: 8000)
  --force           Allow creating in a non-empty directory
  -h, --help        Show this help message
`;

export const normalizeCreateArgs = (args: string[]): string[] => {
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    return ['help'];
  }

  if (args[0] === 'new' || args[0] === 'help') {
    return args;
  }

  return ['new', ...args];
};

const main = async () => {
  try {
    const parsed = parseCliArgs(normalizeCreateArgs(Deno.args));

    if (parsed.command === 'help') {
      console.log(CREATE_HELP_TEXT);
      return;
    }

    const targetDir = resolve(parsed.targetDir);
    const projectName = basename(targetDir);

    await createProject({
      targetDir,
      projectName,
      port: parsed.port,
      force: parsed.force,
    });

    console.log(`Created alpine-server project in ${targetDir}`);
    console.log('Run:');
    console.log(`  cd ${parsed.targetDir}`);
    console.log('  deno run --allow-net --allow-read --allow-write --allow-env --watch main.ts');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    console.log('');
    console.log(CREATE_HELP_TEXT);
    console.log('Alternative:');
    console.log(getHelpText());
    Deno.exit(1);
  }
};

if (import.meta.main) {
  await main();
}
