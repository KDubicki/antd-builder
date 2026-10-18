// @vitest-environment node
import { crc32, inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { createZip } from '.';

/** Reads an archive back through its central directory, checking every checksum. */
function readZip(zip: Buffer): Record<string, string> {
  const end = zip.length - 22;
  expect(zip.readUInt32LE(end)).toBe(0x06054b50);
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  const files: Record<string, string> = {};
  for (let i = 0; i < count; i += 1) {
    expect(zip.readUInt32LE(at)).toBe(0x02014b50);
    const crc = zip.readUInt32LE(at + 16);
    const size = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);

    expect(zip.readUInt32LE(local)).toBe(0x04034b50);
    const start = local + 30 + zip.readUInt16LE(local + 26);
    const data = inflateRawSync(zip.subarray(start, start + size));
    expect(crc32(data)).toBe(crc);
    files[name] = data.toString('utf8');
    at += 46 + nameLength;
  }
  return files;
}

describe('createZip', () => {
  it('packs files that read back intact', () => {
    const files = {
      'app/page.tsx': 'export default function Page() {}\n',
      'data/zażółć.json': '{"emoji":"🚀"}',
      'empty.txt': '',
    };
    expect(readZip(createZip(files))).toEqual(files);
  });

  it('is reproducible', () => {
    expect(createZip({ a: 'x' }).equals(createZip({ a: 'x' }))).toBe(true);
  });

  it('packs an empty archive', () => {
    expect(readZip(createZip({}))).toEqual({});
  });
});
