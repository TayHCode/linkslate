import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cli, scratch } from './helpers.mjs';

test('CLI warns on stderr, writes both output files, and succeeds', async () => {
  const dir = await scratch('cli-warnings');
  await writeFile(join(dir, 'links.txt'), 'Alex\nSite example.com\nPodcast\nOops javascript:alert(1)');
  const result = cli(['--out', 'site'], dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Line 3:.*Podcast.*has no web address/);
  assert.match(result.stderr, /Line 4:.*not supported/);
  assert.match(result.stdout, /page is ready/);
  assert.match(await readFile(join(dir, 'site/index.html'), 'utf8'), /<h1>Alex<\/h1>/);
  const headers = await readFile(join(dir, 'site/_headers'), 'utf8');
  for (const directive of ["default-src 'none'", 'img-src https: data:', "style-src 'unsafe-inline'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'", 'X-Content-Type-Options: nosniff', 'Referrer-Policy: no-referrer']) assert.ok(headers.includes(directive));
});

test('missing files and missing names exit 1 with actionable errors and no stack', async () => {
  const dir = await scratch('cli-errors');
  const missing = cli(['--input', 'missing.txt'], dir);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Could not find.*missing.txt.*--input/);
  await writeFile(join(dir, 'empty.txt'), '# blank');
  const empty = cli(['--input', 'empty.txt'], dir);
  assert.equal(empty.status, 1);
  assert.match(empty.stderr, /Add your name/);
  for (const result of [missing, empty]) assert.doesNotMatch(result.stderr, /\n\s+at |node:internal|Error:/);
});

test('input/output paths, theme override, unknown themes and bad options', async () => {
  const dir = await scratch('cli-options');
  await writeFile(join(dir, 'my links.txt'), 'Alex\ntheme: clean\nSite example.com');
  const result = cli(['--input', 'my links.txt', '--out', 'my site', '--theme', 'paper'], dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(join(dir, 'my site/index.html'), 'utf8'), /data-theme="paper"/);
  const unknown = cli(['--input', 'my links.txt', '--theme', 'nope'], dir);
  assert.equal(unknown.status, 0);
  assert.match(unknown.stderr, /Unknown theme.*clean/);
  for (const args of [['--out'], ['--oops'], ['--theme', '--out']]) {
    const invalid = cli(args, dir);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /Unknown or incomplete option/);
  }
  assert.equal(cli(['--help'], dir).status, 0);
});

test('CLI skips HTTP photos and explains HTTPS on the original line', async () => {
  const dir = await scratch('cli-http-photo');
  await writeFile(join(dir, 'links.txt'), 'Alex\nphoto: http://example.com/me.jpg\nSite https://example.com');
  const result = cli(['--out', 'site'], dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Line 2: photo must start with https:\/\//);
  assert.doesNotMatch(await readFile(join(dir, 'site/index.html'), 'utf8'), /<img |og:image|http:\/\/example.com\/me.jpg/);
});
