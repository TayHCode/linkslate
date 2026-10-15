import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parse.mjs';
import { render } from '../src/render.mjs';
import { emailUrl } from './helpers.mjs';

test('external links are safe new tabs; mailto and tel stay native', () => {
  const html = render(parse(`Alex\nWeb https://example.com\nOld http://example.org\nMail ${emailUrl('a')}\nCall ${'tel:+' + ['1', '555', '555', '5555'].join('')}\nUnsafe javascript:alert(1)\nUnsafe data:text/html,hi`));
  const anchors = html.match(/<a\s[^>]+>/g);
  assert.equal(anchors.length, 4);
  for (const anchor of anchors) {
    if (/href="https?:/.test(anchor)) {
      assert.match(anchor, /target="_blank"/);
      assert.match(anchor, /rel="noopener noreferrer"/);
    } else assert.doesNotMatch(anchor, /target=|rel=/);
  }
  for (const anchor of anchors) assert.doesNotMatch(anchor, /href="(?:javascript:|data:)/);
});

test('renderer defends untrusted models independently of parser', () => {
  const html = render({ name: '<script>" &', bio: '<svg/onload=alert(1)>', theme: '__proto__', photo: 'javascript:alert(1)', links: [
    { label: '<img onerror="bad"> &', url: 'https://example.com/?x="y"&z=2' },
    { label: 'bad', url: 'javascript:alert(1)' },
    { label: 'bad', url: 'data:text/html,hello' },
    { label: 'bad', url: '\u0000javascript:alert(1)' },
  ] });
  assert.match(html, /&lt;img onerror=&quot;bad&quot;&gt; &amp;/);
  assert.match(html, /href="https:\/\/example.com\/\?x=&quot;y&quot;&amp;z=2"/);
  assert.equal((html.match(/<a /g) || []).length, 1);
  assert.doesNotMatch(html, /<script|<img|<svg\//i);
  for (const anchor of html.match(/<a\s[^>]+>/g)) assert.doesNotMatch(anchor, /href="(?:javascript|data):/i);
});
