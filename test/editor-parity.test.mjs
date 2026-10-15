import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { TextEncoder } from 'node:util';
import { root, example, messy, cliHtml, unzip, roundtripModels, expectedRoundtrip, emailUrl } from './helpers.mjs';
import { resolve } from 'node:path';

const editor = await readFile(resolve(root, 'editor.html'), 'utf8');
const script = editor.match(/<script id="linkslate-core">([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({ TextEncoder, URL, Uint8Array, DataView });
vm.runInContext(script, context, { timeout: 3000 });
const core = context.LinkslateCore;

test('editor core ZIP equals real CLI bytes for example, messy, unicode and empty-link pages', async () => {
  const inputs = [example, messy, `name: 李 “Lí” 🌿\nbio: Art & <things>\ntheme: sunset\nHello — https://example.com/?a=1&b=2#hi\nEmail ${emailUrl('li')}`, 'Alex\nJust a bio'];
  for (let i = 0; i < inputs.length; i++) {
    for (const [kind, text] of [['raw', inputs[i]], ['boxes', core.format(core.parse(inputs[i]))]]) {
      const bytes = core.buildZipBytes(text);
      assert.deepEqual(bytes, core.buildZipBytes(text), 'ZIP must be deterministic');
      const files = unzip(bytes);
      assert.deepEqual([...files.keys()], ['index.html', 'links.txt', '_headers']);
      assert.equal(files.get('links.txt'), text);
      assert.equal(files.get('index.html'), await cliHtml(text, `parity-${i}-${kind}`));
      assert.equal(files.get('_headers'), core.HEADERS);
    }
  }
});

test('committed editor calls the shared parser, formatter, renderer and ZIP API', () => {
  assert.match(editor, /const text = core\.format\(/);
  assert.match(editor, /const parsed = core\.parse\(text\)/);
  assert.match(editor, /const html = core\.render\(parsed\)/);
  assert.match(editor, /download\(globalThis\.Linkslate\.buildZipBytes\(\)/);
  assert.doesNotMatch(editor, /(?:src="https?:|<script[^>]+src=|@import|@font-face)/);
});

test('Linkslate API ZIP round-trips seeded editor models and matches the CLI', async () => {
  for (const [index, model] of roundtripModels().entries()) {
    assert.ok(context.Linkslate, 'The editor must expose its shared Linkslate API');
    const files = unzip(context.Linkslate.buildZipBytes(model));
    const text = files.get('links.txt');
    const { warnings, ...parsed } = core.parse(text);
    assert.deepEqual(JSON.parse(JSON.stringify(parsed)), expectedRoundtrip(model));
    assert.equal(warnings.length, 0);
    assert.equal(files.get('index.html'), await cliHtml(text, `parity-model-${index}`));
  }
});
