import { hexToBytes, readUInt32LE, readUInt64LE, reverseBytes, bytesToHex } from '../utils/hex';
import { readVarInt, writeVarInt } from './varint';
import { hash256 } from '../utils/hash';

export interface RawInput {
  txid: string;
  vout: number;
  scriptSig: Uint8Array;
  sequence: number;
}

export interface RawOutput {
  value: bigint;
  scriptPubKey: Uint8Array;
}

export interface RawTransaction {
  version: number;
  segwit: boolean;
  inputs: RawInput[];
  outputs: RawOutput[];
  witnesses: Uint8Array[][];
  locktime: number;
}

export function parseRawTransaction(rawTxHex: string): RawTransaction {
  const bytes = hexToBytes(rawTxHex);
  let offset = 0;
  
  const version = readUInt32LE(bytes, offset);
  offset += 4;
  
  let segwit = false;
  if (bytes[offset] === 0x00 && bytes[offset + 1] === 0x01) {
    segwit = true;
    offset += 2;
  }
  
  const inputCountResult = readVarInt(bytes, offset);
  offset += inputCountResult.size;
  const inputCount = inputCountResult.value;
  
  const inputs: RawInput[] = [];
  for (let i = 0; i < inputCount; i++) {
    const txidBytes = bytes.slice(offset, offset + 32);
    const txid = bytesToHex(reverseBytes(txidBytes));
    offset += 32;
    
    const vout = readUInt32LE(bytes, offset);
    offset += 4;
    
    const scriptSigLenResult = readVarInt(bytes, offset);
    offset += scriptSigLenResult.size;
    const scriptSigLen = scriptSigLenResult.value;
    const scriptSig = bytes.slice(offset, offset + scriptSigLen);
    offset += scriptSigLen;
    
    const sequence = readUInt32LE(bytes, offset);
    offset += 4;
    
    inputs.push({ txid, vout, scriptSig, sequence });
  }
  
  const outputCountResult = readVarInt(bytes, offset);
  offset += outputCountResult.size;
  const outputCount = outputCountResult.value;
  
  const outputs: RawOutput[] = [];
  for (let i = 0; i < outputCount; i++) {
    const value = readUInt64LE(bytes, offset);
    offset += 8;
    
    const scriptPubKeyLenResult = readVarInt(bytes, offset);
    offset += scriptPubKeyLenResult.size;
    const scriptPubKeyLen = scriptPubKeyLenResult.value;
    const scriptPubKey = bytes.slice(offset, offset + scriptPubKeyLen);
    offset += scriptPubKeyLen;
    
    outputs.push({ value, scriptPubKey });
  }
  
  const witnesses: Uint8Array[][] = [];
  if (segwit) {
    for (let i = 0; i < inputCount; i++) {
      const witnessItemCountResult = readVarInt(bytes, offset);
      offset += witnessItemCountResult.size;
      const witnessItemCount = witnessItemCountResult.value;
      
      const witnessStack: Uint8Array[] = [];
      for (let j = 0; j < witnessItemCount; j++) {
        const itemLenResult = readVarInt(bytes, offset);
        offset += itemLenResult.size;
        const itemLen = itemLenResult.value;
        const item = bytes.slice(offset, offset + itemLen);
        offset += itemLen;
        witnessStack.push(item);
      }
      witnesses.push(witnessStack);
    }
  }
  
  const locktime = readUInt32LE(bytes, offset);
  offset += 4;
  
  return {
    version,
    segwit,
    inputs,
    outputs,
    witnesses,
    locktime,
  };
}

function uint32LE(value: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = value & 0xff;
  b[1] = (value >>> 8) & 0xff;
  b[2] = (value >>> 16) & 0xff;
  b[3] = (value >>> 24) & 0xff;
  return b;
}

function uint64LE(value: bigint): Uint8Array {
  const b = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    b[i] = Number((value >> BigInt(8 * i)) & 0xffn);
  }
  return b;
}

function serializeNonWitness(tx: RawTransaction): Uint8Array {
  const parts: Uint8Array[] = [];

  parts.push(uint32LE(tx.version));
  parts.push(writeVarInt(tx.inputs.length));

  for (const inp of tx.inputs) {
    parts.push(reverseBytes(hexToBytes(inp.txid)));
    parts.push(uint32LE(inp.vout));
    parts.push(writeVarInt(inp.scriptSig.length));
    parts.push(inp.scriptSig);
    parts.push(uint32LE(inp.sequence));
  }

  parts.push(writeVarInt(tx.outputs.length));

  for (const out of tx.outputs) {
    parts.push(uint64LE(out.value));
    parts.push(writeVarInt(out.scriptPubKey.length));
    parts.push(out.scriptPubKey);
  }

  parts.push(uint32LE(tx.locktime));

  const total = parts.reduce((s, p) => s + p.length, 0);
  const buf = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    buf.set(p, pos);
    pos += p.length;
  }
  return buf;
}

export function computeTxid(tx: RawTransaction): string {
  const serialized = serializeNonWitness(tx);
  return bytesToHex(reverseBytes(hash256(serialized)));
}

export function computeWtxid(tx: RawTransaction, rawBytes: Uint8Array): string {
  return bytesToHex(reverseBytes(hash256(rawBytes)));
}
