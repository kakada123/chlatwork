import { BadRequestException } from '@nestjs/common';

/** Read encoded dimensions before native decoding so a small upload cannot allocate an enormous bitmap. */
export function assertProfileImageDimensions(buffer: Buffer, mime: string) {
  let width = 0;
  let height = 0;
  if (mime === 'image/png' && buffer.length >= 24) {
    width = buffer.readUInt32BE(16);
    height = buffer.readUInt32BE(20);
  } else if (mime === 'image/webp') {
    for (let offset = 12; offset + 8 <= buffer.length;) {
      const kind = buffer.toString('ascii', offset, offset + 4);
      const size = buffer.readUInt32LE(offset + 4);
      const start = offset + 8;
      if (start + size > buffer.length) break;
      if (kind === 'VP8X' && size >= 10) {
        width = buffer.readUIntLE(start + 4, 3) + 1;
        height = buffer.readUIntLE(start + 7, 3) + 1;
        break;
      }
      if (
        kind === 'VP8 ' &&
        size >= 10 &&
        buffer.toString('hex', start + 3, start + 6) === '9d012a'
      ) {
        width = buffer.readUInt16LE(start + 6) & 0x3fff;
        height = buffer.readUInt16LE(start + 8) & 0x3fff;
        break;
      }
      if (kind === 'VP8L' && size >= 5 && buffer[start] === 0x2f) {
        const bits = buffer.readUInt32LE(start + 1);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
        break;
      }
      offset = start + size + (size % 2);
    }
  } else if (mime === 'image/jpeg') {
    for (let offset = 2; offset + 4 <= buffer.length;) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1]!;
      if (marker === 0xff) {
        offset += 1;
        continue;
      }
      const size = buffer.readUInt16BE(offset + 2);
      if (size < 2 || offset + 2 + size > buffer.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker) &&
        size >= 7
      ) {
        height = buffer.readUInt16BE(offset + 5);
        width = buffer.readUInt16BE(offset + 7);
        break;
      }
      offset += size + 2;
    }
  }
  if (!width || !height)
    throw new BadRequestException('This image has an invalid header.');
  if (width > 16000 || height > 16000 || width * height > 16_000_000)
    throw new BadRequestException('Images must be 16 megapixels or smaller.');
}
