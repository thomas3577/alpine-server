import { assert, assertEquals, assertRejects, assertStringIncludes, assertThrows } from '@std/assert';
import { basename, join } from '@std/path';

import { buildScaffoldFiles, createProject, parseCliArgs } from './scaffold.ts';

const asTextContent = (content: string | Uint8Array): string => {
  if (typeof content !== 'string') {
    throw new TypeError('Expected scaffold content to be text');
  }
  return content;
};

Deno.test('parseCliArgs', async (t) => {
  await t.step('returns help when no args are passed', () => {
    const parsed = parseCliArgs([]);
    assertEquals(parsed.command, 'help');
  });

  await t.step('parses new command with defaults', () => {
    const parsed = parseCliArgs(['new', 'my-app']);
    assertEquals(parsed.command, 'new');
    assertEquals(parsed.targetDir, 'my-app');
    assertEquals(parsed.port, 8000);
    assertEquals(parsed.force, false);
  });

  await t.step('parses new command with options', () => {
    const parsed = parseCliArgs(['new', 'my-app', '--port', '3000', '--force']);
    assertEquals(parsed.command, 'new');
    assertEquals(parsed.port, 3000);
    assertEquals(parsed.force, true);
  });

  await t.step('throws for unknown command', () => {
    assertThrows(() => parseCliArgs(['init', 'my-app']), Error, 'Unknown command');
  });

  await t.step('throws for missing project name', () => {
    assertThrows(() => parseCliArgs(['new']), Error, 'Missing required <project-name> argument for new command');
  });

  await t.step('throws for invalid port', () => {
    assertThrows(() => parseCliArgs(['new', 'my-app', '--port', 'abc']), Error, 'Invalid port');
  });
});

Deno.test('buildScaffoldFiles returns expected files', () => {
  const files = buildScaffoldFiles('demo-app', 5000);

  assert('main.ts' in files);
  assert('deno.json' in files);
  assert('README.md' in files);
  assert(join('public', 'index.html') in files);
  assert(join('public', 'favicon.png') in files);
  assert(join('public', 'main.js') in files);
  assert(join('public', 'style.css') in files);
  assert(join('.vscode', 'settings.json') in files);
  assert(join('.vscode', 'launch.json') in files);

  assertStringIncludes(asTextContent(files['main.ts']), 'port: 5000');
  assertStringIncludes(asTextContent(files['README.md']), '# demo-app');
  assertStringIncludes(asTextContent(files[join('public', 'index.html')]), 'href="favicon.png"');
  assert(files[join('public', 'favicon.png')] instanceof Uint8Array);
  assertStringIncludes(asTextContent(files[join('.vscode', 'launch.json')]), '"type": "node"');
  assertStringIncludes(asTextContent(files[join('.vscode', 'launch.json')]), '"runtimeExecutable": "deno"');
  assertStringIncludes(asTextContent(files[join('.vscode', 'launch.json')]), '"url": "http://localhost:5000"');
});

Deno.test('createProject writes scaffold files', async () => {
  const tempRoot = await Deno.makeTempDir({ prefix: 'alpine-server-cli-' });
  const targetDir = join(tempRoot, 'new-app');

  const written = await createProject({
    targetDir,
    projectName: 'new-app',
    port: 4100,
    force: false,
  });

  assertEquals(written.length, 9);

  const main = await Deno.readTextFile(join(targetDir, 'main.ts'));
  assertStringIncludes(main, 'port: 4100');

  const html = await Deno.readTextFile(join(targetDir, 'public', 'index.html'));
  assertStringIncludes(html, '<title>new-app</title>');
  assertStringIncludes(html, 'href="favicon.png"');

  const favicon = await Deno.readFile(join(targetDir, 'public', 'favicon.png'));
  assertEquals(favicon.length > 0, true);

  const vscodeSettings = await Deno.readTextFile(join(targetDir, '.vscode', 'settings.json'));
  assertStringIncludes(vscodeSettings, '"deno.enable": true');
});

Deno.test('createProject rejects non-empty target without force', async () => {
  const tempRoot = await Deno.makeTempDir({ prefix: 'alpine-server-cli-' });
  const targetDir = join(tempRoot, 'existing-app');

  await Deno.mkdir(targetDir, { recursive: true });
  await Deno.writeTextFile(join(targetDir, 'keep.txt'), 'keep');

  await assertRejects(
    () =>
      createProject({
        targetDir,
        projectName: basename(targetDir),
        port: 8000,
        force: false,
      }),
    Error,
    'Target directory is not empty',
  );
});
