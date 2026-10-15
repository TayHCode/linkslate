import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cliHtml, example, root, scratch } from './helpers.mjs';

test('built example and 200 links stay within site and HTML budgets', async () => {
  const many = 'Alex\nA page of useful things\n' + Array.from({ length: 200 }, (_, i) => `A thoughtful link number ${i} https://example.com/somewhere/${i}?a=b&c=d`).join('\n');
  for (const [name, text] of [['size-example', example], ['size-200', many]]) {
    const html = await cliHtml(text, name);
    assert.ok(Buffer.byteLength(html) < 100 * 1024);
    const dist = resolve(await scratch(name), 'dist');
    const files = await readdir(dist);
    assert.deepEqual(files.sort(), ['_headers', 'index.html']);
    const sizes = await Promise.all(files.map(file => stat(resolve(dist, file))));
    assert.ok(sizes.reduce((sum, info) => sum + info.size, 0) < 1024 * 1024);
  }
});

test('self-contained editor is under 300 KB', async () => {
  assert.ok((await readFile(resolve(root, 'editor.html'))).length < 300 * 1024);
});
