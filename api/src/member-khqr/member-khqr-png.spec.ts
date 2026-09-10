import { crc32, deflateSync } from 'node:zlib';
import { loadImage } from '@napi-rs/canvas';
import { sanitizeKhqrPng } from './member-khqr-png';

function chunk(type: string, content: Buffer) {
  const body = Buffer.concat([Buffer.from(type), content]);
  const length = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  length.writeUInt32BE(content.length);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function png(
  options: {
    raw?: Buffer;
    metadata?: boolean;
    interlace?: number;
    color?: number;
    palette?: boolean;
    depth?: number;
  } = {},
) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = options.depth ?? 8;
  header[9] = options.color ?? 6;
  header[12] = options.interlace ?? 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    ...(options.metadata
      ? [chunk('tEXt', Buffer.from('Comment\0test metadata'))]
      : []),
    ...(options.palette
      ? [
          chunk('PLTE', Buffer.from([0, 0, 0, 255, 255, 255])),
          chunk('tRNS', Buffer.from([255, 255])),
        ]
      : []),
    chunk('IDAT', deflateSync(options.raw ?? Buffer.from([0, 0, 0, 0, 255]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('KHQR PNG sanitization', () => {
  it('produces a readable PNG without metadata or trailing content', async () => {
    const result = sanitizeKhqrPng(
      Buffer.concat([png({ metadata: true }), Buffer.from('trailing data')]),
    );
    expect(result.includes(Buffer.from('test metadata'))).toBe(false);
    expect(result.includes(Buffer.from('trailing data'))).toBe(false);
    const image = await loadImage(result);
    expect([image.width, image.height]).toEqual([1, 1]);
  });

  it.each([
    { interlace: 1 },
    { color: 0, depth: 1, raw: Buffer.from([0, 0]) },
    { color: 3, depth: 1, palette: true, raw: Buffer.from([0, 0]) },
    { color: 2, depth: 16, raw: Buffer.from([0, 0, 0, 0, 0, 0, 0]) },
  ])('preserves supported color and interlace modes: %j', async (options) => {
    const result = sanitizeKhqrPng(png(options));
    const image = await loadImage(result);
    expect([image.width, image.height]).toEqual([1, 1]);
  });

  it('rejects truncated headers, chunks and files without reaching a native decoder', () => {
    const valid = png();
    for (const length of [0, 8, 20, 33, valid.length - 1]) {
      expect(() => sanitizeKhqrPng(valid.subarray(0, length))).toThrow();
    }
  });

  it('rejects modified checksums', () => {
    const bytes = png();
    bytes[29] ^= 1;
    expect(() => sanitizeKhqrPng(bytes)).toThrow();
  });

  it.each([
    { raw: Buffer.from([5, 0, 0, 0, 255]) },
    { raw: Buffer.alloc(1_000_000) },
    { raw: Buffer.alloc(1) },
    { color: 3, depth: 1, raw: Buffer.from([0, 0]) },
    { color: 1 },
    { depth: 3 },
    { interlace: 2 },
  ])('rejects invalid or excessive scanline data case %#', (options) => {
    expect(() => sanitizeKhqrPng(png(options))).toThrow();
  });
});
