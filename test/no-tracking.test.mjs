import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { render } from '../src/render.mjs';
import { parse } from '../src/parse.mjs';
import { root, example } from './helpers.mjs';

test('source, editor and output have no networking APIs or tracking services', async () => {
  const sourceFiles = (await readdir(resolve(root, 'src'))).map(name => `src/${name}`);
  const paths = [...sourceFiles, 'build.mjs', 'editor.html'];
  const forbidden = /\b(?:analytics|beacon|fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|cookie|gtag|plausible|umami)\b/i;
  for (const path of paths) assert.doesNotMatch(await readFile(resolve(root, path), 'utf8'), forbidden, path);
  const output = render(parse(example));
  assert.doesNotMatch(output, forbidden);
  assert.doesNotMatch(output, /<(?:script|iframe|embed|object)\b|\b(?:ping|onload|onclick)=|@import|@font-face|url\(/i);
  const editor = await readFile(resolve(root, 'editor.html'), 'utf8');
  assert.doesNotMatch(editor, /<script[^>]*\bsrc=|<link[^>]*\bhref="https?:|<img[^>]*\bsrc="https?:/i);
});
