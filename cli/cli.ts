/**
 * CLI module entrypoint for alpine-server project scaffolding and page management.
 *
 * Parses command-line arguments and creates new alpine-server projects
 * or adds pages to existing projects.
 */
import { basename, resolve } from '@std/path';

import { getHelpText, getVersion, parseCliArgs } from './parser.ts';
import { addPage, createProject } from './scaffold.ts';

const assertUnreachable = (_value: never): never => {
  throw new Error('Unreachable');
};

const main = async () => {
  try {
    const parsed = parseCliArgs(Deno.args);

    if (parsed.command === 'version') {
      console.log(getVersion());
      return;
    }

    if (parsed.command === 'help') {
      console.log(getHelpText());
      return;
    }

    if (parsed.command === 'add') {
      await addPage({
        pageName: parsed.pageName,
        force: parsed.force,
      });

      console.log(`Added page "${parsed.pageName}" at public/${parsed.pageName}/index.html`);
      return;
    }

    if (parsed.command === 'new') {
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
      console.log('  deno task dev');
      return;
    }

    assertUnreachable(parsed);
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
