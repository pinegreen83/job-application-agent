// Deterministic placeholder for native development; not a product logo.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}
const size = 32;
const pixels = Buffer.alloc(size * (size * 4 + 1));
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const mark = (x >= 9 && x <= 22 && y >= 7 && y <= 10)
      || (x >= 18 && x <= 21 && y >= 8 && y <= 22)
      || (x >= 10 && x <= 20 && y >= 21 && y <= 24)
      || (x >= 8 && x <= 11 && y >= 18 && y <= 22);
    pixels.set(mark ? [255, 255, 255, 255] : [40, 92, 69, 255], y * (size * 4 + 1) + 1 + x * 4);
  }
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader[6] = size;
icoHeader[7] = size;
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(png.length, 14);
icoHeader.writeUInt32LE(22, 18);
const directory = new URL('../src-tauri/icons/', import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL('icon.png', directory), png);
writeFileSync(new URL('icon.ico', directory), Buffer.concat([icoHeader, png]));
