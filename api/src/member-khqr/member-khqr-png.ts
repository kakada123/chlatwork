import { BadRequestException } from '@nestjs/common';
import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc(bytes: Buffer) {
  let result = 0xffffffff;
  for (const byte of bytes)
    result = CRC_TABLE[(result ^ byte) & 255] ^ (result >>> 8);
  return (result ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length);
  output.write(type, 4, 4, 'ascii');
  data.copy(output, 8);
  output.writeUInt32BE(crc(output.subarray(4, -4)), output.length - 4);
  return output;
}

// Validate PNG structure and the bounded scanline stream without a native image
// decoder (which crashes on some truncated PNGs). Repack pixels losslessly while
// discarding metadata and trailing content; animation is rejected.
// See https://www.w3.org/TR/png/.
export function sanitizeKhqrPng(bytes: Buffer): Buffer {
  const invalid = () => {
    throw new BadRequestException('The file is not a valid static PNG image');
  };
  if (
    bytes.length < 33 ||
    !bytes.subarray(0, 8).equals(SIGNATURE) ||
    bytes.toString('ascii', 12, 16) !== 'IHDR' ||
    bytes.readUInt32BE(8) !== 13
  )
    invalid();
  const header = bytes.subarray(16, 29);
  const width = header.readUInt32BE(0),
    height = header.readUInt32BE(4);
  if (!width || !height || width > 2048 || height > 2048) {
    throw new BadRequestException('PNG dimensions must be at most 2048 × 2048');
  }
  const depth = header[8],
    color = header[9],
    interlace = header[12];
  const channels: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const depths =
    color === 0 ? [1, 2, 4, 8, 16] : color === 3 ? [1, 2, 4, 8] : [8, 16];
  if (
    !channels[color] ||
    !depths.includes(depth) ||
    header[10] !== 0 ||
    header[11] !== 0 ||
    interlace > 1
  )
    invalid();
  let palette: Buffer | undefined, transparency: Buffer | undefined;
  const compressed: Buffer[] = [];
  let ended = false,
    dataEnded = false;
  for (let offset = 8; offset < bytes.length;) {
    if (offset + 12 > bytes.length) invalid();
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) invalid();
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, end - 4);
    if (
      !/^[A-Za-z]{4}$/.test(type) ||
      crc(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)
    )
      invalid();
    if (compressed.length && type !== 'IDAT') dataEnded = true;
    if (type === 'IHDR') {
      if (offset !== 8 || length !== 13) invalid();
    } else if (type === 'PLTE') {
      if (
        palette ||
        transparency ||
        compressed.length ||
        [0, 4].includes(color) ||
        !length ||
        length % 3 ||
        length > 768 ||
        (color === 3 && length / 3 > 2 ** depth)
      )
        invalid();
      palette = data;
    } else if (type === 'tRNS') {
      if (
        transparency ||
        compressed.length ||
        (color === 0
          ? length !== 2
          : color === 2
            ? length !== 6
            : color === 3
              ? !palette || !length || length > palette.length / 3
              : true)
      )
        invalid();
      transparency = data;
    } else if (type === 'IDAT') {
      if (dataEnded || (color === 3 && !palette)) invalid();
      compressed.push(data);
    } else if (type === 'IEND') {
      if (length || !compressed.length) invalid();
      ended = true;
      break;
    } else if (
      type === 'acTL' ||
      type === 'fcTL' ||
      type === 'fdAT' ||
      (bytes[offset + 4] & 32) === 0
    )
      invalid();
    offset = end;
  }
  if (!ended) invalid();

  // Adam7 passes have their own row widths and filter bytes; the same bound
  // applies to ordinary PNGs as a single pass.
  const passes = interlace
    ? [
        [0, 0, 8, 8],
        [4, 0, 8, 8],
        [0, 4, 4, 8],
        [2, 0, 4, 4],
        [0, 2, 2, 4],
        [1, 0, 2, 2],
        [0, 1, 1, 2],
      ]
    : [[0, 0, 1, 1]];
  const rows: number[] = [];
  for (const [x, y, dx, dy] of passes) {
    const passWidth = Math.max(0, Math.ceil((width - x) / dx));
    const passHeight = Math.max(0, Math.ceil((height - y) / dy));
    if (passWidth)
      for (let row = 0; row < passHeight; row++)
        rows.push(1 + Math.ceil((passWidth * channels[color] * depth) / 8));
  }
  const expected = rows.reduce((sum, size) => sum + size, 0);
  let pixels: Buffer;
  try {
    pixels = inflateSync(Buffer.concat(compressed), {
      maxOutputLength: expected,
    });
  } catch {
    return invalid();
  }
  if (pixels.length !== expected) invalid();
  let position = 0;
  for (const size of rows) {
    if (pixels[position] > 4) invalid();
    position += size;
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    ...(palette ? [chunk('PLTE', palette)] : []),
    ...(transparency ? [chunk('tRNS', transparency)] : []),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
