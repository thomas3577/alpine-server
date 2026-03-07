import { assert, assertEquals, assertRejects, assertStringIncludes, assertThrows } from '@std/assert';
import { basename, join } from '@std/path';

import { getVersion, parseCliArgs } from './parser.ts';
import { addPage, buildPageFiles, buildScaffoldFiles, createProject } from './scaffold.ts';

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

  await t.step('parses add command', () => {
    const parsed = parseCliArgs(['add', 'about']);
    assertEquals(parsed.command, 'add');
    assertEquals(parsed.pageName, 'about');
    assertEquals(parsed.force, false);
  });

  await t.step('parses add command with force', () => {
    const parsed = parseCliArgs(['add', 'contact', '--force']);
    assertEquals(parsed.command, 'add');
    assertEquals(parsed.pageName, 'contact');
    assertEquals(parsed.force, true);
  });

  await t.step('throws for missing page name', () => {
    assertThrows(() => parseCliArgs(['add']), Error, 'Missing required <page-name> argument for add command');
  });

  await t.step('throws for invalid page name with path traversal', () => {
    assertThrows(() => parseCliArgs(['add', '../evil']), Error, 'Invalid page name');
  });

  await t.step('throws for invalid page name with uppercase', () => {
    assertThrows(() => parseCliArgs(['add', 'About']), Error, 'Invalid page name');
  });

  await t.step('throws for invalid page name with special chars', () => {
    assertThrows(() => parseCliArgs(['add', 'my_page']), Error, 'Invalid page name');
  });

  await t.step('accepts hyphenated page names', () => {
    const parsed = parseCliArgs(['add', 'about-us']);
    assertEquals(parsed.pageName, 'about-us');
  });

  await t.step('returns version for -v flag', () => {
    const parsed = parseCliArgs(['-v']);
    assertEquals(parsed.command, 'version');
  });

  await t.step('returns version for --version flag', () => {
    const parsed = parseCliArgs(['--version']);
    assertEquals(parsed.command, 'version');
  });
});

Deno.test('getVersion returns a semver string', () => {
  const version = getVersion();
  assert(/^\d+\.\d+\.\d+/.test(version));
});

Deno.test('buildScaffoldFiles returns expected files', () => {
  const files = buildScaffoldFiles('demo-app', 5000);

  assert('app.ts' in files);
  assert('deno.json' in files);
  assert('README.md' in files);
  assert(join('public', 'index.html') in files);
  assert(join('public', 'favicon.png') in files);
  assert(join('public', 'main.js') in files);
  assert(join('public', 'style.css') in files);
  assert(join('.vscode', 'settings.json') in files);
  assert(join('.vscode', 'launch.json') in files);

  assertStringIncludes(asTextContent(files['app.ts']), 'port: 5000');
  assertStringIncludes(asTextContent(files['README.md']), '# demo-app');
  assertStringIncludes(asTextContent(files[join('public', 'index.html')]), 'href="favicon.png"');
  assert(files[join('public', 'favicon.png')] instanceof Uint8Array);
  assertStringIncludes(asTextContent(files[join('.vscode', 'launch.json')]), '"type": "node"');
  assertStringIncludes(asTextContent(files[join('.vscode', 'launch.json')]), '"runtimeExecutable": "deno"');
  assertStringIncludes(asTextContent(files[join('.vscode', 'launch.json')]), '"url": "http://localhost:5000"');
});

Deno.test('buildScaffoldFiles includes alp task in deno.json', () => {
  const files = buildScaffoldFiles('demo-app', 5000);
  const denoJson = asTextContent(files['deno.json']);
  assertStringIncludes(denoJson, '"alp"');
  assertStringIncludes(denoJson, 'jsr:@dx/alpine-server/cli');
});

Deno.test('buildPageFiles returns index.html with correct content', () => {
  const files = buildPageFiles('about');
  assert('index.html' in files);
  assertStringIncludes(files['index.html'], '<title>About</title>');
  assertStringIncludes(files['index.html'], 'x-data');
  assertStringIncludes(files['index.html'], 'href="/style.css"');
  assertStringIncludes(files['index.html'], 'src="/main.js"');
  assertStringIncludes(files['index.html'], 'href="/">Home</a>');
});

Deno.test('buildPageFiles capitalizes hyphenated names', () => {
  const files = buildPageFiles('about-us');
  assertStringIncludes(files['index.html'], '<title>About Us</title>');
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

  const main = await Deno.readTextFile(join(targetDir, 'app.ts'));
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

Deno.test('addPage creates page in public directory', async () => {
  const tempRoot = await Deno.makeTempDir({ prefix: 'alpine-server-cli-' });
  const originalDir = Deno.cwd();

  await Deno.mkdir(join(tempRoot, 'public'), { recursive: true });
  Deno.chdir(tempRoot);

  try {
    const written = await addPage({ pageName: 'about', force: false });
    assertEquals(written.length, 1);

    const html = await Deno.readTextFile(join(tempRoot, 'public', 'about', 'index.html'));
    assertStringIncludes(html, '<title>About</title>');
    assertStringIncludes(html, 'x-data');
  } finally {
    Deno.chdir(originalDir);
  }
});

Deno.test('addPage rejects when public/ does not exist', async () => {
  const tempRoot = await Deno.makeTempDir({ prefix: 'alpine-server-cli-' });
  const originalDir = Deno.cwd();

  Deno.chdir(tempRoot);

  try {
    await assertRejects(
      () => addPage({ pageName: 'about', force: false }),
      Error,
      'No public/ directory found',
    );
  } finally {
    Deno.chdir(originalDir);
  }
});

Deno.test('addPage rejects existing page without force', async () => {
  const tempRoot = await Deno.makeTempDir({ prefix: 'alpine-server-cli-' });
  const originalDir = Deno.cwd();

  await Deno.mkdir(join(tempRoot, 'public', 'about'), { recursive: true });
  await Deno.writeTextFile(join(tempRoot, 'public', 'about', 'index.html'), '<html></html>');
  Deno.chdir(tempRoot);

  try {
    await assertRejects(
      () => addPage({ pageName: 'about', force: false }),
      Error,
      'already exists',
    );
  } finally {
    Deno.chdir(originalDir);
  }
});

Deno.test('addPage overwrites existing page with force', async () => {
  const tempRoot = await Deno.makeTempDir({ prefix: 'alpine-server-cli-' });
  const originalDir = Deno.cwd();

  await Deno.mkdir(join(tempRoot, 'public', 'about'), { recursive: true });
  await Deno.writeTextFile(join(tempRoot, 'public', 'about', 'index.html'), '<html>old</html>');
  Deno.chdir(tempRoot);

  try {
    const written = await addPage({ pageName: 'about', force: true });
    assertEquals(written.length, 1);

    const html = await Deno.readTextFile(join(tempRoot, 'public', 'about', 'index.html'));
    assertStringIncludes(html, '<title>About</title>');
  } finally {
    Deno.chdir(originalDir);
  }
});
