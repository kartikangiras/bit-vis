import { readUInt32LE } from '../utils/hex';

export interface UndoRecord {
  height: number;
  isCoinbase: boolean;
  value: bigint;
  scriptPubKey: Uint8Array;
}

const UNDO_MAGIC = 0xd9b4bef9;

const SECP256K1_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
const SECP256K1_EXP = (SECP256K1_P + 1n) / 4n;

function modpow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

function readCustomVarInt(bytes: Uint8Array, offset: number): { value: bigint; size: number } {
  let v = 0n;
  let size = 0;
  while (true) {
    const b = bytes[offset + size];
    size++;
    if (b & 0x80) {
      v = (v << 7n) | BigInt(b & 0x7f);
      v++;
    } else {
      v = (v << 7n) | BigInt(b);
      break;
    }
  }
  return { value: v, size };
}

function readCompactSize(bytes: Uint8Array, offset: number): { value: number; size: number } {
  const first = bytes[offset];
  if (first < 0xfd) return { value: first, size: 1 };
  if (first === 0xfd) return { value: bytes[offset + 1] | (bytes[offset + 2] << 8), size: 3 };
  if (first === 0xfe) {
    return {
      value: (bytes[offset + 1] | (bytes[offset + 2] << 8) | (bytes[offset + 3] << 16) | (bytes[offset + 4] << 24)) >>> 0,
      size: 5,
    };
  }
  return { value: 0, size: 9 };
}

function decompressAmount(x: bigint): bigint {
  if (x === 0n) return 0n;
  x -= 1n;
  const e = x % 10n;
  x /= 10n;
  let n: bigint;
  if (e < 9n) {
    const d = (x % 9n) + 1n;
    x /= 9n;
    n = x * 10n + d;
  } else {
    n = x + 1n;
  }
  let exp = e;
  while (exp > 0n) {
    n *= 10n;
    exp--;
  }
  return n;
}

function decompressScript(nSize: number, data: Uint8Array): Uint8Array {
  if (nSize === 0) {
    const out = new Uint8Array(25);
    out[0] = 0x76; out[1] = 0xa9; out[2] = 0x14;
    out.set(data.slice(0, 20), 3);
    out[23] = 0x88; out[24] = 0xac;
    return out;
  }
  if (nSize === 1) {
    const out = new Uint8Array(23);
    out[0] = 0xa9; out[1] = 0x14;
    out.set(data.slice(0, 20), 2);
    out[22] = 0x87;
    return out;
  }
  if (nSize === 2 || nSize === 3) {
    const out = new Uint8Array(35);
    out[0] = 0x21;
    out[1] = nSize;
    out.set(data.slice(0, 32), 2);
    out[34] = 0xac;
    return out;
  }
  if (nSize === 4 || nSize === 5) {
    const prefix = nSize - 2;
    const xBytes = data.slice(0, 32);
    const x = BigInt('0x' + Array.from(xBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
    const ySq = (modpow(x, 3n, SECP256K1_P) + 7n) % SECP256K1_P;
    let y = modpow(ySq, SECP256K1_EXP, SECP256K1_P);
    const yIsEven = (y & 1n) === 0n;
    const wantEven = prefix === 2;
    if (yIsEven !== wantEven) y = SECP256K1_P - y;
    const out = new Uint8Array(67);
    out[0] = 0x41; out[1] = 0x04;
    out.set(xBytes, 2);
    const yBytes = y.toString(16).padStart(64, '0');
    for (let i = 0; i < 32; i++) out[34 + i] = parseInt(yBytes.slice(i * 2, i * 2 + 2), 16);
    out[66] = 0xac;
    return out;
  }
  return data.slice(0, nSize - 6);
}

function getSpecialScriptSize(nSize: number): number {
  if (nSize === 0 || nSize === 1) return 20;
  if (nSize >= 2 && nSize <= 5) return 32;
  return 0;
}

function parseCBlockUndo(bytes: Uint8Array, offset: number, end: number): UndoRecord[][] {
  const txRecords: UndoRecord[][] = [];

  const txCountResult = readCompactSize(bytes, offset);
  offset += txCountResult.size;
  const txCount = txCountResult.value;

  for (let i = 0; i < txCount && offset < end; i++) {
    const inputCountResult = readCompactSize(bytes, offset);
    offset += inputCountResult.size;
    const inputCount = inputCountResult.value;

    const inputs: UndoRecord[] = [];
    for (let j = 0; j < inputCount && offset < end; j++) {
      const codeResult = readCustomVarInt(bytes, offset);
      offset += codeResult.size;
      const height = Number(codeResult.value >> 1n);
      const isCoinbase = (codeResult.value & 1n) === 1n;

      const valResult = readCustomVarInt(bytes, offset);
      offset += valResult.size;
      const value = decompressAmount(valResult.value);

      const nSizeResult = readCustomVarInt(bytes, offset);
      offset += nSizeResult.size;
      const nSize = Number(nSizeResult.value);

      let scriptPubKey: Uint8Array;
      if (nSize < 6) {
        const dataLen = getSpecialScriptSize(nSize);
        const data = bytes.slice(offset, offset + dataLen);
        offset += dataLen;
        scriptPubKey = decompressScript(nSize, data);
      } else {
        const rawLen = nSize - 6;
        scriptPubKey = bytes.slice(offset, offset + rawLen);
        offset += rawLen;
      }

      inputs.push({ height, isCoinbase, value, scriptPubKey });
    }
    txRecords.push(inputs);
  }

  return txRecords;
}

export function parseUndoData(bytes: Uint8Array): UndoRecord[][][] {
  const blocks: UndoRecord[][][] = [];
  let offset = 0;

  while (offset + 8 <= bytes.length) {
    const magic = readUInt32LE(bytes, offset);
    if (magic !== UNDO_MAGIC) {
      offset++;
      continue;
    }
    offset += 4;

    const size = readUInt32LE(bytes, offset);
    offset += 4;

    if (offset + size > bytes.length) break;

    const blockRecords = parseCBlockUndo(bytes, offset, offset + size);
    blocks.push(blockRecords);
    break;
  }

  return blocks;
}