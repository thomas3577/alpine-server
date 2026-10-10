import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { basename, join } from 'node:path';
import { getVersion, parseCliArgs } from './parser.ts';
import { addPage, buildPageFiles, buildScaffoldFiles, createProject } from './scaffold.ts';

const assertIncludes = (actual: string, expected: string): void => {
  assert.ok(actual.includes(expected), `Expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
};

const asTextContent = (content: string | Uint8Array): string => {
  if (typeof content !== 'string') {
    throw new TypeError('Expected scaffold content to be text');
  }
  return content;
};

describe('parseCliArgs', () => {
  it('returns help when no args are passed', () => {
    const parsed = parseCliArgs([]);
    assert.deepEqual(parsed.command, 'help');
  });

  it('parses new command with defaults', () => {
    const parsed = parseCliArgs(['new', 'my-app']);
    assert.ok(parsed.command === 'new');
    assert.deepEqual(parsed.targetDir, 'my-app');
    assert.deepEqual(parsed.port, 8000);
    assert.deepEqual(parsed.force, false);
  });

  it('parses new command with options', () => {
    const parsed = parseCliArgs(['new', 'my-app', '--port', '3000', '--force']);
    assert.ok(parsed.command === 'new');
    assert.deepEqual(parsed.port, 3000);
    assert.deepEqual(parsed.force, true);
  });

  it('throws for unknown command', () => {
    assert.throws(() => parseCliArgs(['init', 'my-app']), /Unknown command/);
  });

  it('throws for missing project name', () => {
    assert.throws(() => parseCliArgs(['new']), /Missing required <project-name> argument for new command/);
  });

  it('throws for invalid port', () => {
    assert.throws(() => parseCliArgs(['new', 'my-app', '--port', 'abc']), /Invalid port/);
  });

  it('parses add command', () => {
    const parsed = parseCliArgs(['add', 'about']);
    assert.ok(parsed.command === 'add');
    assert.deepEqual(parsed.pageName, 'about');
    assert.deepEqual(parsed.force, false);
  });

  it('parses add command with force', () => {
    const parsed = parseCliArgs(['add', 'contact', '--force']);
    assert.ok(parsed.command === 'add');
    assert.deepEqual(parsed.pageName, 'contact');
    assert.deepEqual(parsed.force, true);
  });

  it('throws for missing page name', () => {
    assert.throws(() => parseCliArgs(['add']), /Missing required <page-name> argument for add command/);
  });

  it('throws for invalid page name with path traversal', () => {
    assert.throws(() => parseCliArgs(['add', '../evil']), /Invalid page name/);
  });

  it('throws for invalid page name with uppercase', () => {
    assert.throws(() => parseCliArgs(['add', 'About']), /Invalid page name/);
  });

  it('throws for invalid page name with special chars', () => {
    assert.throws(() => parseCliArgs(['add', 'my_page']), /Invalid page name/);
  });

  it('accepts hyphenated page names', () => {
    const parsed = parseCliArgs(['add', 'about-us']);
    assert.ok(parsed.command === 'add');
    assert.deepEqual(parsed.pageName, 'about-us');
  });

  it('returns version for -v flag', () => {
    const parsed = parseCliArgs(['-v']);
    assert.deepEqual(parsed.command, 'version');
  });

  it('returns version for --version flag', () => {
    const parsed = parseCliArgs(['--version']);
    assert.deepEqual(parsed.command, 'version');
  });
});

it('getVersion includes alpine-server, Hono, and Alpine.js versions', () => {
  const version = getVersion();
  assert.ok(/^alpine-server \d+\.\d+\.\d+ \(Hono \S+, Alpine\.js \d+\.\d+\.\d+\)$/.test(version));
});

it('buildScaffoldFiles returns expected files', () => {
  const files = buildScaffoldFiles('demo-app', 5000);

  assert.ok('app.ts' in files);
  assert.ok('deno.json' in files);
  assert.ok('README.md' in files);
  assert.ok(join('public', 'index.html') in files);
  assert.ok(join('public', 'favicon.png') in files);
  assert.ok(join('public', 'main.js') in files);
  assert.ok(join('public', 'style.css') in files);
  assert.ok(join('.vscode', 'settings.json') in files);
  assert.ok(join('.vscode', 'launch.json') in files);

  assertIncludes(asTextContent(files['app.ts']), 'port: 5000');
  assertIncludes(asTextContent(files['README.md']), '# demo-app');
  assertIncludes(asTextContent(files[join('public', 'index.html')]), 'href="favicon.png"');
  assert.ok(files[join('public', 'favicon.png')] instanceof Uint8Array);
  assertIncludes(asTextContent(files[join('.vscode', 'launch.json')]), '"type": "node"');
  assertIncludes(asTextContent(files[join('.vscode', 'launch.json')]), '"runtimeExecutable": "deno"');
  assertIncludes(asTextContent(files[join('.vscode', 'launch.json')]), '"url": "http://localhost:5000"');
});

it('buildScaffoldFiles includes alp task in deno.json', () => {
  const files = buildScaffoldFiles('demo-app', 5000);
  const denoJson = asTextContent(files['deno.json']);
  assertIncludes(denoJson, '"alp"');
  assertIncludes(denoJson, 'jsr:@dx/alpine-server@');
  assertIncludes(denoJson, '/cli');
});

it('buildPageFiles returns index.html with correct content', () => {
  const files = buildPageFiles('about');
  assert.ok('index.html' in files);
  assertIncludes(files['index.html'], '<title>About</title>');
  assertIncludes(files['index.html'], 'x-data');
  assertIncludes(files['index.html'], 'href="/style.css"');
  assertIncludes(files['index.html'], 'src="/main.js"');
  assertIncludes(files['index.html'], 'href="/">Home</a>');
});

it('buildPageFiles capitalizes hyphenated names', () => {
  const files = buildPageFiles('about-us');
  assertIncludes(files['index.html'], '<title>About Us</title>');
});

it('createProject writes scaffold files', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'alpine-server-cli-'));
  try {
    const targetDir = join(tempRoot, 'new-app');

    const written = await createProject({
      targetDir,
      projectName: 'new-app',
      port: 4100,
      force: false,
    });

    assert.deepEqual(written.length, 9);

    const main = await readFile(join(targetDir, 'app.ts'), 'utf8');
    assertIncludes(main, 'port: 4100');

    const html = await readFile(join(targetDir, 'public', 'index.html'), 'utf8');
    assertIncludes(html, '<title>new-app</title>');
    assertIncludes(html, 'href="favicon.png"');

    const favicon = await readFile(join(targetDir, 'public', 'favicon.png'));
    assert.deepEqual(favicon.length > 0, true);

    const vscodeSettings = await readFile(join(targetDir, '.vscode', 'settings.json'), 'utf8');
    assertIncludes(vscodeSettings, '"deno.enable": true');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

it('createProject rejects non-empty target without force', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'alpine-server-cli-'));
  try {
    const targetDir = join(tempRoot, 'existing-app');

    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, 'keep.txt'), 'keep');

    await assert.rejects(
      () =>
        createProject({
          targetDir,
          projectName: basename(targetDir),
          port: 8000,
          force: false,
        }),
      /Target directory is not empty/,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

it('addPage creates page in public directory', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'alpine-server-cli-'));
  const originalDir = process.cwd();

  await mkdir(join(tempRoot, 'public'), { recursive: true });
  process.chdir(tempRoot);

  try {
    const written = await addPage({ pageName: 'about', force: false });
    assert.deepEqual(written.length, 1);

    const html = await readFile(join(tempRoot, 'public', 'about', 'index.html'), 'utf8');
    assertIncludes(html, '<title>About</title>');
    assertIncludes(html, 'x-data');
  } finally {
    process.chdir(originalDir);
    await rm(tempRoot, { recursive: true, force: true });
  }
});

it('addPage rejects when public/ does not exist', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'alpine-server-cli-'));
  const originalDir = process.cwd();

  process.chdir(tempRoot);

  try {
    await assert.rejects(
      () => addPage({ pageName: 'about', force: false }),
      /No public\/ directory found/,
    );
  } finally {
    process.chdir(originalDir);
  }
});

it('addPage rejects existing page without force', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'alpine-server-cli-'));
  const originalDir = process.cwd();

  await mkdir(join(tempRoot, 'public', 'about'), { recursive: true });
  await writeFile(join(tempRoot, 'public', 'about', 'index.html'), '<html></html>');
  process.chdir(tempRoot);

  try {
    await assert.rejects(
      () => addPage({ pageName: 'about', force: false }),
      /already exists/,
    );
  } finally {
    process.chdir(originalDir);
  }
});

it('addPage overwrites existing page with force', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'alpine-server-cli-'));
  const originalDir = process.cwd();

  await mkdir(join(tempRoot, 'public', 'about'), { recursive: true });
  await writeFile(join(tempRoot, 'public', 'about', 'index.html'), '<html>old</html>');
  process.chdir(tempRoot);

  try {
    const written = await addPage({ pageName: 'about', force: true });
    assert.deepEqual(written.length, 1);

    const html = await readFile(join(tempRoot, 'public', 'about', 'index.html'), 'utf8');
    assertIncludes(html, '<title>About</title>');
  } finally {
    process.chdir(originalDir);
  }
});
