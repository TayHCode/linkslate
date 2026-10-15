import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from '../src/parse.mjs';
import { render } from '../src/render.mjs';
import { THEME_NAMES } from '../src/themes.mjs';
import { root, example, cli, validateHtml } from './helpers.mjs';

test('example and every theme pass strict structural validation', async () => {
  const directory = resolve(root, '.scratch/test-out');
  await mkdir(directory, { recursive: true });
  const result = cli(['--out', resolve(directory, 'example')]);
  assert.equal(result.status, 0, result.stderr);
  validateHtml(await readFile(resolve(directory, 'example/index.html'), 'utf8'));
  for (const theme of THEME_NAMES) {
    const output = resolve(directory, theme);
    const built = cli(['--out', output, '--theme', theme]);
    assert.equal(built.status, 0, built.stderr);
    validateHtml(await readFile(resolve(output, 'index.html'), 'utf8'));
    const photo = render({ ...parse(example), theme, photo: 'https://example.com/me.jpg' });
    validateHtml(photo);
    await writeFile(resolve(output, 'photo.html'), photo);
  }
});
