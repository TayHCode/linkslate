const zipEncoder = new TextEncoder();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function makeZip(files) {
  if (files.length > 65535) throw new Error('Too many files for this zip.');
  const prepared = files.map(file => {
    if (!file.name || /(^\/|\\|(^|\/)\.\.($|\/)|\u0000)/u.test(file.name)) throw new Error('Use a safe relative zip filename.');
    const name = zipEncoder.encode(file.name);
    const bytes = typeof file.bytes === 'string' ? zipEncoder.encode(file.bytes) : new Uint8Array(file.bytes);
    if (name.length > 65535 || bytes.length > 0xffffffff) throw new Error('This file is too large for this zip.');
    return { name, bytes, crc: crc32(bytes) };
  });
  const localSize = prepared.reduce((size, file) => size + 30 + file.name.length + file.bytes.length, 0);
  const centralSize = prepared.reduce((size, file) => size + 46 + file.name.length, 0);
  if (localSize + centralSize + 22 > 0xffffffff) throw new Error('This zip is too large.');
  const output = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(output.buffer);
  const u16 = (offset, value) => view.setUint16(offset, value, true);
  const u32 = (offset, value) => view.setUint32(offset, value, true);
  let offset = 0;
  let central = localSize;
  for (const file of prepared) {
    u32(offset, 0x04034b50);
    u16(offset + 4, 20);
    u16(offset + 6, 0x0800);
    u16(offset + 12, 0x0021);
    u32(offset + 14, file.crc);
    u32(offset + 18, file.bytes.length);
    u32(offset + 22, file.bytes.length);
    u16(offset + 26, file.name.length);
    output.set(file.name, offset + 30);
    output.set(file.bytes, offset + 30 + file.name.length);
    u32(central, 0x02014b50);
    u16(central + 4, 20);
    u16(central + 6, 20);
    u16(central + 8, 0x0800);
    u16(central + 14, 0x0021);
    u32(central + 16, file.crc);
    u32(central + 20, file.bytes.length);
    u32(central + 24, file.bytes.length);
    u16(central + 28, file.name.length);
    u32(central + 42, offset);
    output.set(file.name, central + 46);
    offset += 30 + file.name.length + file.bytes.length;
    central += 46 + file.name.length;
  }
  u32(central, 0x06054b50);
  u16(central + 8, prepared.length);
  u16(central + 10, prepared.length);
  u32(central + 12, centralSize);
  u32(central + 16, localSize);
  return output;
}
