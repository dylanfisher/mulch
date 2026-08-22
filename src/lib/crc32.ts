/**
 * @role CRC-32/ISO-HDLC over bytes — the one checksum this build computes, for every container
 *   that carries one.
 * @instead What the checksum goes into → src/lib/sessionArchive.ts and src/lib/zip.ts, which are
 *   two containers with two layouts and one arithmetic.
 */

/**
 * One byte's worth of the CRC-32 polynomial, folded once at module load. The bit-at-a-time form
 * this replaces did eight shifts per byte, and an archive carrying a source pays that per byte of
 * audio: measured at 96ms for an 11.5MB blob against 19ms here, on both create and parse.
 */
const CRC32_TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let byte = 0; byte < 256; byte++) {
    let crc = byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    table[byte] = crc;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  // Indexed rather than `for…of`: iterating a Uint8Array through its iterator measured three
  // times slower than this loop, which is the whole point of the table.
  for (let index = 0; index < bytes.length; index++) {
    crc = (CRC32_TABLE[(crc ^ (bytes[index] ?? 0)) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
