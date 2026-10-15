import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, format, LinkslateError } from '../src/parse.mjs';
import { example, roundtripModels, expectedRoundtrip, emailUrl, phoneUrl } from './helpers.mjs';

test('friendly example has a name, appended bio, theme and six links', () => {
  const model = parse(example);
  assert.equal(model.name, 'Maya Chen');
  assert.match(model.bio, /Designer.*Based in Portland/);
  assert.equal(model.theme, 'clean');
  assert.equal(model.links.length, 6);
  assert.equal(model.links.at(-1).url, 'https://example.com/maya/contact');
  assert.deepEqual(model.warnings, []);
});

test('header accepts photo, bio lines and a theme anywhere', () => {
  const model = parse('Alex\nhttps://example.com/me.jpg\nHello there\nI make things\ntheme: paper\nSite https://example.com\ntheme: sunset\nhttps://example.org/path');
  assert.equal(model.photo, 'https://example.com/me.jpg');
  assert.equal(model.bio, 'Hello there I make things');
  assert.equal(model.theme, 'sunset');
  assert.deepEqual(model.links, [{ label: 'Site', url: 'https://example.com' }, { label: 'example.org', url: 'https://example.org/path' }]);
});

test('explicit keys support URLs in bio and name', () => {
  const model = parse(`name: Alex at https://example.com\nbio: I write at https://example.org\nphoto: example.com/me.png\ntheme: midnight\nEmail: ${emailUrl('alex')}\nPhone | ${phoneUrl}`);
  assert.equal(model.name, 'Alex at https://example.com');
  assert.equal(model.bio, 'I write at https://example.org');
  assert.equal(model.photo, 'https://example.com/me.png');
  assert.equal(model.links[0].label, 'Email');
  assert.equal(model.links[1].label, 'Phone');
  assert.equal(model.links[0].url, emailUrl('alex'));
  assert.equal(model.links[1].url, phoneUrl);
});

test('header text ending in a URL is a link, not a bio', () => {
  const model = parse('Alex\nI write here https://example.com\nThis is a label without an address');
  assert.deepEqual(model.links, [{ label: 'I write here', url: 'https://example.com' }]);
  assert.equal(model.bio, '');
  assert.equal(model.warnings[0].line, 3);
  assert.match(model.warnings[0].message, /has no web address/);
});

test('name-only and name plus bio pages are allowed', () => {
  for (const input of ['Alex', 'Alex\nA short bio']) {
    const model = parse(input);
    assert.equal(model.links.length, 0);
    assert.match(model.warnings[0].message, /No links yet/);
  }
});

test('missing name is a friendly domain error', () => {
  for (const text of ['', '\uFEFF\n# comment', 'name: ""\nbio: Hello\ntheme: clean']) {
    assert.throws(() => parse(text), error => error instanceof LinkslateError && /your name.*first content line/i.test(error.message) && /Alex Morgan/.test(error.message));
  }
});

test('editor formatting preserves valid models and multiline fields', () => {
  const source = parse(example);
  const roundtrip = parse(format(source));
  assert.deepEqual(roundtrip, source);
  assert.equal(parse(format({ name: 'A\nB', bio: 'Hi\r\nthere', links: [] })).name, 'A\nB');
});

test('first content name accepts dots and arbitrary colons', () => {
  for (const name of ['John.Doe', 'Artist: Alex', 'Alex: designer', 'name:', 'https://example.com']) {
    assert.equal(parse(`# comment\n\n${name}\nSite https://example.com`).name, name);
  }
  assert.equal(parse('theme: paper\nArtist: Alex\nSite https://example.com').name, 'Artist: Alex');
});

test('seeded editor models preserve all profile text, labels, order and theme', () => {
  for (const model of roundtripModels()) {
    const { warnings, ...parsed } = parse(format(model));
    assert.deepEqual(parsed, expectedRoundtrip(model), JSON.stringify(model));
    assert.deepEqual(warnings, []);
  }
});

test('blank line ends the header and reserved link labels cannot change profile fields', () => {
  const model = parse('Alex\nbio: theme: paper\ntheme: midnight\n\nPhoto: https://example.com/photo\nTheme: https://example.com/theme\nhttps://example.com/empty\ntheme: sunset');
  assert.equal(model.bio, 'theme: paper');
  assert.equal(model.photo, '');
  assert.equal(model.theme, 'sunset');
  assert.deepEqual(model.links.map(link => link.label), ['Photo', 'Theme', 'example.com']);
});

test('HTTP photos are skipped with line-numbered HTTPS warnings', () => {
  for (const line of ['photo: http://example.com/me.jpg', 'http://example.com/me.jpg']) {
    const model = parse(`Alex\n${line}\nSite https://example.com`);
    assert.equal(model.photo, '');
    assert.match(model.warnings[0].message, /photo must start with https:\/\//);
    assert.equal(model.warnings[0].line, 2);
    assert.equal(model.links.length, 1);
  }
});
