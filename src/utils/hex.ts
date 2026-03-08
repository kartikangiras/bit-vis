export function hexToBytes(hex: string): Uint8Array {
  // Strip any whitespace (spaces, newlines, tabs) from copy-paste
  hex = hex.replace(/\s+/g, '');
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function readUInt32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

export function readUInt64LE(bytes: Uint8Array, offset: number): bigint {
  const low = readUInt32LE(bytes, offset);
  const high = readUInt32LE(bytes, offset + 4);
  return BigInt(high) * (2n ** 32n) + BigInt(low);
}

export function reverseBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array([...bytes].reverse());
}
