import test from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, THEME_NAMES, DEFAULT_THEME } from '../src/themes.mjs';
import { parse } from '../src/parse.mjs';
import { render } from '../src/render.mjs';
import { validateHtml, example } from './helpers.mjs';

function luminance(hex) {
  const components = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return components[0] * .2126 + components[1] * .7152 + components[2] * .0722;
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

test('four named themes have WCAG AA text and button colours', () => {
  assert.deepEqual(THEME_NAMES, ['clean', 'midnight', 'sunset', 'paper']);
  assert.equal(DEFAULT_THEME, 'clean');
  for (const [name, theme] of Object.entries(THEMES)) {
    for (const foreground of [theme.text, theme.muted]) {
      for (const background of [theme.surface, theme.background]) assert.ok(contrast(foreground, background) >= 4.5, `${name}: ${foreground} on ${background}`);
    }
    assert.ok(contrast(theme.buttonText, theme.button) >= 4.5, `${name} button`);
    for (const stop of theme.backdrop.match(/#[a-f\d]{6}/gi) || []) assert.ok(contrast(theme.text, stop) >= 4.5, `${name} footer on ${stop}`);
  }
});

test('every theme is distinct and supports no photo/photo and zero/200 links', () => {
  const outputs = new Set();
  for (const theme of THEME_NAMES) {
    const model = { ...parse(example), theme };
    outputs.add(render(model));
    for (const photo of ['', 'https://example.com/me.jpg']) {
      for (const count of [0, 200]) {
        const html = render({ ...model, photo, links: Array.from({ length: count }, (_, i) => ({ label: `Link ${i}`, url: `https://example.com/${i}` })) });
        assert.match(html, new RegExp(`data-theme="${theme}"`));
        assert.equal((html.match(/<li>/g) || []).length, count);
        assert.equal((html.match(/<img /g) || []).length, photo ? 1 : 0);
        validateHtml(html);
      }
    }
  }
  assert.equal(outputs.size, 4);
});
