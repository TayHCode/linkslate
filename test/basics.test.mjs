import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parse.mjs';
import { render } from '../src/render.mjs';
import { example, validateHtml } from './helpers.mjs';

test('page includes accessible, social, mobile and private basics', () => {
  const html = render(parse(example));
  validateHtml(html);
  for (const pattern of [/<title>Maya Chen · Links<\/title>/, /name="description" content="Designer/, /width=device-width, initial-scale=1/, /property="og:title"/, /property="og:description"/, /property="og:type" content="website"/, /name="twitter:card" content="summary"/, /rel="icon" href="data:image\/svg\+xml,/, /min-height:52px/, /:focus-visible/, /prefers-reduced-motion:reduce/, /overflow-wrap:anywhere/, /system-ui/]) assert.match(html, pattern);
  assert.doesNotMatch(html, /<script|<iframe|@import|@font-face|og:url|og:image|\burl\(/i);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.equal((html.match(/(?:src|href)="https?:/g) || []).length, 6);
});

test('photo has safe attributes and social image tags', () => {
  const html = render(parse('name: Alex & Jo\nphoto: https://example.com/photo.jpg\nSite https://example.com'));
  const photo = html.match(/<img [^>]*>/)[0];
  for (const value of ['alt="Alex &amp; Jo"', 'width="88"', 'height="88"', 'loading="lazy"', 'decoding="async"', 'referrerpolicy="no-referrer"']) assert.ok(photo.includes(value));
  assert.match(html, /property="og:image" content="https:\/\/example.com\/photo.jpg"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
});

test('favicon carries the first Unicode character and theme colour safely', () => {
  const html = render(parse('name: & Alex\ntheme: midnight'));
  const encoded = html.match(/href="data:image\/svg\+xml,([^"]+)"/)[1];
  const svg = decodeURIComponent(encoded.replace(/&amp;/g, '&').replace(/&#39;/g, "'"));
  assert.match(svg, /fill="#d7c9ff"/);
  assert.match(svg, />&amp;<\/text>/);
});

test('HTTP photos are never rendered even in an unparsed model', () => {
  const html = render({ ...parse(example), photo: 'http://example.com/me.jpg' });
  assert.doesNotMatch(html, /<img |og:image|http:\/\/example.com\/me.jpg/);
  assert.match(html, /name="twitter:card" content="summary"/);
});
