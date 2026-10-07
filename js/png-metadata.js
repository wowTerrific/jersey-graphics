/**
 * Utility to inject physical pixel resolution metadata (pHYs chunk)
 * into a PNG ArrayBuffer/Blob so applications like Adobe Photoshop,
 * Illustrator, CorelDRAW, and DTF/DTG RIP software automatically detect 300 DPI.
 */

// Precompute CRC-32 lookup table for standard PNG chunks
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
  }
  CRC_TABLE[n] = c;
}

/**
 * Calculates CRC-32 checksum for a slice of a Uint8Array
 */
function crc32(buffer, offset, length) {
  let c = 0xffffffff;
  const end = offset + length;
  for (let i = offset; i < end; i++) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Builds a PNG pHYs (physical pixel dimensions) chunk for a specified DPI.
 * Standard formula: pixels per meter = Math.round(dpi / 0.0254)
 * For 300 DPI: 300 / 0.0254 = 11811 pixels/meter
 * 
 * @param {number} dpi - Target resolution in DPI (defaults to 300)
 * @returns {Uint8Array} - Complete 21-byte pHYs chunk (length, type, data, crc)
 */
export function createPhysChunk(dpi = 300) {
  const ppm = Math.round(dpi / 0.0254); // Pixels per meter (11811 for 300 DPI)
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);

  // 1. Chunk Data Length (9 bytes)
  view.setUint32(0, 9);

  // 2. Chunk Type: 'pHYs' (0x70 0x48 0x59 0x73)
  chunk[4] = 0x70; // 'p'
  chunk[5] = 0x48; // 'H'
  chunk[6] = 0x59; // 'Y'
  chunk[7] = 0x73; // 's'

  // 3. X axis pixels per unit
  view.setUint32(8, ppm);

  // 4. Y axis pixels per unit
  view.setUint32(12, ppm);

  // 5. Unit specifier: 1 = meter
  chunk[16] = 1;

  // 6. CRC-32 over chunk type and chunk data (offset 4, length 13)
  const crc = crc32(chunk, 4, 13);
  view.setUint32(17, crc);

  return chunk;
}

/**
 * Injects or replaces the pHYs chunk in a PNG ArrayBuffer.
 * The pHYs chunk MUST be inserted after IHDR and before IDAT.
 * 
 * @param {ArrayBuffer} pngBuffer - Original PNG ArrayBuffer from canvas.toBlob()
 * @param {number} dpi - Desired DPI (300)
 * @returns {ArrayBuffer} - New PNG buffer containing the 300 DPI pHYs chunk
 */
export function injectDpiIntoPng(pngBuffer, dpi = 300) {
  const bytes = new Uint8Array(pngBuffer);

  // Verify PNG header signature: 137 80 78 71 13 10 26 10
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    console.warn('Invalid PNG header signature, skipping DPI injection.');
    return pngBuffer;
  }

  const physChunk = createPhysChunk(dpi);

  // Standard IHDR chunk ends at byte index 33 (8-byte PNG header + 4 len + 4 type + 13 data + 4 crc = 33)
  const view = new DataView(pngBuffer);
  let offset = 8;
  let ihdrEndOffset = 33;
  let existingPhysOffset = -1;
  let existingPhysTotalLen = 0;

  // Scan chunks to locate existing pHYs if already present
  while (offset < bytes.length) {
    const chunkLen = view.getUint32(offset);
    const chunkType = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );

    if (chunkType === 'IHDR') {
      ihdrEndOffset = offset + 12 + chunkLen;
    } else if (chunkType === 'pHYs') {
      existingPhysOffset = offset;
      existingPhysTotalLen = 12 + chunkLen;
      break;
    } else if (chunkType === 'IDAT') {
      // pHYs must appear before IDAT; stop searching
      break;
    }

    offset += 12 + chunkLen;
  }

  if (existingPhysOffset !== -1) {
    // Replace existing pHYs chunk
    const newLength = bytes.length - existingPhysTotalLen + physChunk.length;
    const newBuffer = new Uint8Array(newLength);
    newBuffer.set(bytes.subarray(0, existingPhysOffset), 0);
    newBuffer.set(physChunk, existingPhysOffset);
    newBuffer.set(bytes.subarray(existingPhysOffset + existingPhysTotalLen), existingPhysOffset + physChunk.length);
    return newBuffer.buffer;
  } else {
    // Insert pHYs chunk directly after IHDR
    const newLength = bytes.length + physChunk.length;
    const newBuffer = new Uint8Array(newLength);
    newBuffer.set(bytes.subarray(0, ihdrEndOffset), 0);
    newBuffer.set(physChunk, ihdrEndOffset);
    newBuffer.set(bytes.subarray(ihdrEndOffset), ihdrEndOffset + physChunk.length);
    return newBuffer.buffer;
  }
}
