import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './helpers.mjs';

test('Cloudflare static assets config and dependency-free Node package', async () => {
  const config = JSON.parse((await readFile(resolve(root, 'wrangler.jsonc'), 'utf8')).replace(/^\s*\/\/.*$/gm, ''));
  assert.match(config.name, /^[a-z][a-z\d-]*$/);
  assert.match(config.compatibility_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!Number.isNaN(Date.parse(config.compatibility_date)));
  assert.equal(config.assets.directory, './dist');
  assert.equal(config.main, undefined);
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.engines.node, '>=18');
  assert.equal(pkg.scripts.build, 'node build.mjs');
  assert.equal(pkg.scripts.test, 'node --test test/');
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) assert.deepEqual(Object.keys(pkg[field] || {}), []);
  assert.match(await readFile(resolve(root, '.gitignore'), 'utf8'), /^dist\/$/m);
});

test('README Deploy button points to Cloudflare when docs are present', async t => {
  let text;
  try { text = await readFile(resolve(root, 'README.md'), 'utf8'); }
  catch (error) {
    if (error.code === 'ENOENT') { t.diagnostic('README belongs to the separate docs worker; checking it when integrated.'); return; }
    throw error;
  }
  assert.match(text, /\[!\[Deploy to Cloudflare\]\([^)]*\)\]\(https:\/\/deploy\.workers\.cloudflare\.com[^)]*\)/i);
});
