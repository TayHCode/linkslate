import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, safeUrl, LinkslateError } from '../src/parse.mjs';
import { render } from '../src/render.mjs';
import { messy } from './helpers.mjs';
import { spawnSync } from 'node:child_process';

test('BOM, CRLF, tabs, comments, curly quotes and emoji survive', () => {
  const model = parse(messy);
  assert.equal(model.name, 'Renée “Ray” ☀️');
  assert.equal(model.bio, 'Designer & maker');
  assert.equal(model.links.length, 3);
  assert.equal(model.links[0].label, 'Site');
  assert.equal(model.links[0].url, 'https://example.com/?q=1&other=2#work');
  assert.equal(model.links[1].url, 'https://github.com/ray');
  assert.deepEqual(model.warnings.map(item => item.line), [9, 10]);
});

test('all label separators are removed and duplicate links are kept', () => {
  const model = parse('Alex\n' + ['-', ':', '|', '–', '—'].map(separator => `Hello ${separator} example.com`).join('\n'));
  assert.equal(model.links.length, 5);
  for (const link of model.links) assert.deepEqual(link, { label: 'Hello', url: 'https://example.com' });
});

test('unsafe and malformed addresses warn, never become links or photos', () => {
  const credentialUrl = 'https://' + ['user', 'secret'].join(':') + '@' + 'example.com';
  const model = parse(`Alex\nphoto: javascript:alert(1)\nGood https://example.com\nBad javascript:alert(1)\nBad data:text/html,hello\nBad ftp://example.com\nBad https://\nBad ${credentialUrl}`);
  assert.equal(model.photo, '');
  assert.equal(model.links.length, 1);
  assert.deepEqual(model.warnings.map(item => item.line), [2, 4, 5, 6, 7, 8]);
  for (const value of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<img>', 'https://a.test/\u0000', 'https://a.test/\t', 'mailto:', 'tel:', 'file:///etc/passwd']) assert.equal(safeUrl(value), null, value);
});

test('unknown and inherited-property themes warn and use clean', () => {
  for (const name of ['neon', 'constructor', '__proto__']) {
    const model = parse(`Alex\ntheme: ${name}\nSite example.com`);
    assert.equal(model.theme, 'clean');
    assert.equal(model.warnings[0].line, 2);
    assert.match(model.warnings[0].message, /clean, midnight, sunset, paper/);
  }
});

test('HTML in all user fields and query strings is escaped', () => {
  const html = render(parse('name: <Alex "A"> & friends\nbio: <img src=x onerror=oops>\n<script>alert(1)</script> https://example.com/?a=1&b=2#hash'));
  assert.match(html, /&lt;Alex &quot;A&quot;&gt; &amp; friends/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /\?a=1&amp;b=2#hash/);
  assert.doesNotMatch(html, /<script\b|<img src=x/);
});

test('ten thousand input lines complete without truncation or hanging', { timeout: 5000 }, () => {
  const model = parse('Alex\n' + Array.from({ length: 10000 }, (_, i) => `Link ${i} https://example.com/${i}`).join('\n'));
  assert.equal(model.links.length, 10000);
  assert.equal(model.links.at(-1).label, 'Link 9999');
});

test('blank and comment noise never becomes a name', () => {
  assert.throws(() => parse('\uFEFF\r\n\t# nothing\r\n \t'), LinkslateError);
});

test('200 KB adversarial separator labels parse in less than 500 ms', () => {
  const script = `
    import { parse } from ${JSON.stringify(new URL('../src/parse.mjs', import.meta.url).href)};
    import { performance } from 'node:perf_hooks';
    const labels = ['-', ':', '|', ' ', '-:| '].map(run => run.repeat(Math.ceil(200 * 1024 / run.length)) + 'x');
    const start = performance.now();
    for (const label of labels) {
      const model = parse('Alex\\n' + label + ' https://example.com');
      if (model.links[0].label !== label.trim()) throw new Error('Label changed');
    }
    const elapsed = performance.now() - start;
    if (elapsed >= 500) throw new Error('Parsing took ' + elapsed + ' ms');
    console.log(elapsed);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 2000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr);
  assert.ok(Number(result.stdout) < 500);
});
