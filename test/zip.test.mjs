import test from 'node:test';
import assert from 'node:assert/strict';
import { makeZip, crc32 } from '../src/zip.mjs';
import { unzip } from './helpers.mjs';

test('stored UTF-8 ZIP has correct CRC32, fixed timestamps and deterministic bytes', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const files = [{ name: '你好 🌿.txt', bytes: 'A little café ☕' }, { name: 'empty.txt', bytes: new Uint8Array() }];
  const bytes = makeZip(files);
  assert.deepEqual(bytes, makeZip(files));
  assert.deepEqual([...unzip(bytes)], files.map(file => [file.name, typeof file.bytes === 'string' ? file.bytes : '']));
  assert.equal(unzip(makeZip([])).size, 0);
});

test('unsafe ZIP paths are rejected', () => {
  for (const name of ['../index.html', '/absolute.txt', 'a/../file', 'bad\\path', 'bad\u0000.txt', '']) assert.throws(() => makeZip([{ name, bytes: '' }]), /safe relative/);
});
