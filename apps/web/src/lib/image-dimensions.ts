/** Read bounded container headers before the native decoder allocates pixels. */
export function imageDimensions(bytes: Uint8Array): { width: number; height: number; mimeType: string } | null {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && b.toString("ascii", 12, 16) === "IHDR") {
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), mimeType: "image/png" };
  }
  if (b.length >= 4 && b[0] === 255 && b[1] === 216) {
    let cursor = 2;
    while (cursor + 4 <= b.length) {
      if (b[cursor++] !== 255) return null;
      while (b[cursor] === 255) cursor++;
      const marker = b[cursor++];
      if (marker === 217 || marker === 218 || cursor + 2 > b.length) return null;
      if (marker === 1 || (marker! >= 208 && marker! <= 215)) continue;
      const length = b.readUInt16BE(cursor);
      if (length < 2 || cursor + length > b.length) return null;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker!) && length >= 8) {
        return { width: b.readUInt16BE(cursor + 5), height: b.readUInt16BE(cursor + 3), mimeType: "image/jpeg" };
      }
      cursor += length;
    }
  }
  if (b.length >= 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const kind = b.toString("ascii", 12, 16);
    if (kind === "VP8X") return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1, mimeType: "image/webp" };
    if (kind === "VP8L" && b[20] === 47) {
      const value = b.readUInt32LE(21);
      return { width: (value & 0x3fff) + 1, height: ((value >>> 14) & 0x3fff) + 1, mimeType: "image/webp" };
    }
    if (kind === "VP8 " && b[23] === 157 && b[24] === 1 && b[25] === 42) return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, mimeType: "image/webp" };
  }
  return null;
}
