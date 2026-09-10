const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// Bank exports can have a .png filename while containing JPEG bytes. Detect
// their actual format without strict decoding or changing the payment image.
export function memberKhqrImageType(
  bytes: Buffer,
): 'image/png' | 'image/jpeg' | null {
  if (
    bytes.length >= 33 &&
    bytes.subarray(0, 8).equals(PNG_SIGNATURE) &&
    bytes.toString('ascii', 12, 16) === 'IHDR'
  )
    return 'image/png';
  if (
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return 'image/jpeg';
  return null;
}
