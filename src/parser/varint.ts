import { readUInt32LE, readUInt64LE } from '../utils/hex';

export interface VarIntResult {
  value: number;
  size: number;
}

export function readVarInt(bytes: Uint8Array, offset: number): VarIntResult {
  const first = bytes[offset];
  
  if (first < 0xfd) {
    return { value: first, size: 1 };
  } else if (first === 0xfd) {
    const value = bytes[offset + 1] | (bytes[offset + 2] << 8);
    return { value, size: 3 };
  } else if (first === 0xfe) {
    const value = readUInt32LE(bytes, offset + 1);
    return { value, size: 5 };
  } else {
    const value = Number(readUInt64LE(bytes, offset + 1));
    return { value, size: 9 };
  }
}

export function writeVarInt(value: number): Uint8Array {
  if (value < 0xfd) {
    return new Uint8Array([value]);
  } else if (value <= 0xffff) {
    return new Uint8Array([0xfd, value & 0xff, (value >> 8) & 0xff]);
  } else if (value <= 0xffffffff) {
    return new Uint8Array([
      0xfe,
      value & 0xff,
      (value >> 8) & 0xff,
      (value >> 16) & 0xff,
      (value >> 24) & 0xff,
    ]);
  } else {
    const big = BigInt(value);
    const bytes = new Uint8Array(9);
    bytes[0] = 0xff;
    for (let i = 0; i < 8; i++) {
      bytes[i + 1] = Number((big >> BigInt(8 * i)) & 0xffn);
    }
    return bytes;
  }
}
