/**
 * CLI module entrypoint for alpine-server project scaffolding.
 *
 * Parses command-line arguments and creates a new alpine-server project
 * with optional target directory, port, and force flags.
 */
import { basename, resolve } from '@std/path';

import { createProject, getHelpText, parseCliArgs } from './src/scaffold.ts';

const main = async () => {
  try {
    const parsed = parseCliArgs(Deno.args);

    if (parsed.command === 'help') {
      console.log(getHelpText());
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
    console.log(getHelpText());
    Deno.exit(1);
  }
};

if (import.meta.main) {
  await main();
}
