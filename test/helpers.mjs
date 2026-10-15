import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const example = await readFile(resolve(root, 'links.txt'), 'utf8');
export const emailUrl = (local, domain = 'example.com') => 'mailto:' + [local, domain].join('@');
export const phoneUrl = 'tel:+' + ['1', '555', '123', '4567'].join('');
export const messy = '\uFEFF# hello\r\n\r\nRenée “Ray” ☀️\r\n\tDesigner & maker\r\ntheme: midnight\r\nSite —\thttps://example.com/?q=1&other=2#work\r\nCode github.com/ray\r\n<script>alert("hi")</script> https://example.org/\r\nBad javascript:alert(1)\r\nPodcast\r\n';

export function roundtripModels() {
  let seed = 0x15c0ffee;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  const characters = ['a', 'Z', '#', ':', '-', '|', '—', ' ', '\t', '\n', '\u2028', '\u2029', '"', '\\', '🌿', '李', '&', '<', '>'];
  const labels = ['Photo:', 'Theme:', '# My site', '', 'Name:', 'Bio:', 'theme: paper', 'Trailing -', '  padded  ', '\\# literal', '"quoted"', 'Line one\nLine two', 'Label\twith\ttabs'];
  for (let i = 0; i < 64; i++) {
    let label = '';
    const length = next() % 80 + 1;
    for (let j = 0; j < length; j++) label += characters[next() % characters.length];
    labels.push(label);
  }
  return labels.map((label, i) => ({
    name: ['John.Doe', 'Artist: Alex', 'name: Not a key', '  # Alex  ', 'Alex\nMorgan', 'Alex\u2028Morgan'][i % 6],
    bio: ['theme: midnight', 'photo: https://example.com/bio', '# A bio\nwith "quotes"', '  bio: leading & trailing  ', 'bio: Alex\u2029Morgan'][i % 5],
    photo: i % 2 ? 'https://example.com/me.jpg' : '',
    theme: ['clean', 'midnight', 'sunset', 'paper'][i % 4],
    links: [{ label, url: 'https://example.com/?a=1&b=2#work' }, { label: 'Follow-up: |', url: i % 2 ? emailUrl('alex') : phoneUrl }],
  }));
}

export function expectedRoundtrip(model) {
  return { ...model, links: model.links.map(link => ({ ...link, label: link.label || new URL(link.url).hostname || new URL(link.url).pathname })) };
}

export async function scratch(name) {
  const directory = resolve(root, '.scratch', `${name}-${process.pid}`);
  await mkdir(directory, { recursive: true });
  return directory;
}

export function cli(args = [], cwd = root) {
  return spawnSync(process.execPath, [resolve(root, 'build.mjs'), ...args], { cwd, encoding: 'utf8' });
}

export async function cliHtml(text, name) {
  const directory = await scratch(name);
  const input = join(directory, 'links.txt');
  const out = join(directory, 'dist');
  await writeFile(input, text);
  const result = cli(['--input', input, '--out', out]);
  assert.equal(result.status, 0, result.stderr);
  return readFile(join(out, 'index.html'), 'utf8');
}

export function validateHtml(html) {
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<html lang="en"/);
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /<meta name="viewport"/);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
  assert.doesNotMatch(html, /<script\b|\son\w+\s*=/i);
  const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
  const stack = [];
  const ids = new Set();
  const tokens = html.replace(/<style>[\s\S]*?<\/style>/g, '<style></style>').match(/<![^>]*>|<\/?[a-z][^>]*>/gi) || [];
  for (const token of tokens) {
    if (token.startsWith('<!')) continue;
    const name = /^<\/?([a-z\d-]+)/i.exec(token)[1].toLowerCase();
    if (token.startsWith('</')) assert.equal(stack.pop(), name, `Unbalanced ${token}`);
    else {
      const id = /\sid="([^"]*)"/.exec(token)?.[1];
      if (id !== undefined) {
        assert.ok(!ids.has(id), `Duplicate id ${id}`);
        ids.add(id);
      }
      if (!voidTags.has(name)) stack.push(name);
      if (name === 'img') for (const attr of ['src', 'alt', 'width', 'height', 'loading', 'decoding', 'referrerpolicy']) assert.match(token, new RegExp(` ${attr}="[^"]*"`));
    }
  }
  assert.deepEqual(stack, []);
}

function checksum(bytes) {
  let value = 0xffffffff;
  const table = Array.from({ length: 256 }, (_, index) => {
    let next = index;
    for (let i = 0; i < 8; i++) next = next & 1 ? (next >>> 1) ^ 0xedb88320 : next >>> 1;
    return next >>> 0;
  });
  for (const byte of bytes) value = table[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

export function unzip(bytes) {
  const buffer = Buffer.from(bytes);
  const end = buffer.length - 22;
  assert.equal(buffer.readUInt32LE(end), 0x06054b50);
  const count = buffer.readUInt16LE(end + 10);
  assert.equal(buffer.readUInt16LE(end + 8), count);
  let central = buffer.readUInt32LE(end + 16);
  const centralStart = central;
  const files = new Map();
  for (let i = 0; i < count; i++) {
    assert.equal(buffer.readUInt32LE(central), 0x02014b50);
    assert.equal(buffer.readUInt16LE(central + 10), 0);
    assert.equal(buffer.readUInt16LE(central + 8), 0x800);
    assert.equal(buffer.readUInt16LE(central + 12), 0);
    assert.equal(buffer.readUInt16LE(central + 14), 33);
    const size = buffer.readUInt32LE(central + 24);
    const length = buffer.readUInt16LE(central + 28);
    const local = buffer.readUInt32LE(central + 42);
    assert.equal(buffer.readUInt32LE(local), 0x04034b50);
    assert.equal(buffer.readUInt16LE(local + 8), 0);
    assert.equal(buffer.readUInt32LE(local + 22), size);
    const name = buffer.subarray(central + 46, central + 46 + length).toString('utf8');
    assert.equal(buffer.subarray(local + 30, local + 30 + length).toString('utf8'), name);
    const data = buffer.subarray(local + 30 + length, local + 30 + length + size);
    assert.equal(checksum(data), buffer.readUInt32LE(central + 16));
    assert.equal(checksum(data), buffer.readUInt32LE(local + 14));
    assert.ok(!files.has(name));
    files.set(name, data.toString('utf8'));
    central += 46 + length + buffer.readUInt16LE(central + 30) + buffer.readUInt16LE(central + 32);
  }
  assert.equal(central, end);
  assert.equal(central - centralStart, buffer.readUInt32LE(end + 12));
  return files;
}
