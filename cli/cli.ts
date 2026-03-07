/**
 * CLI module entrypoint for alpine-server project scaffolding and page management.
 *
 * Parses command-line arguments and creates new alpine-server projects
 * or adds pages to existing projects.
 */
import { basename, resolve } from '@std/path';

import { addPage, createProject, getHelpText, parseCliArgs } from './scaffold.ts';

const main = async () => {
  try {
    const parsed = parseCliArgs(Deno.args);

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
