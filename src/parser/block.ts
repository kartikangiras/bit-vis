import { hexToBytes, bytesToHex, reverseBytes, readUInt32LE } from '../utils/hex';
import { hash256 } from '../utils/hash';

export interface BlockHeader {
  version: number;
  prevBlockHash: string;
  merkleRoot: string;
  timestamp: number;
  bits: number;
  nonce: number;
  blockHash: string;
}

export function parseBlockHeader(bytes: Uint8Array, offset: number): { header: BlockHeader; size: number } {
  const headerBytes = bytes.slice(offset, offset + 80);
  
  const version = readUInt32LE(headerBytes, 0);
  const prevBlockHash = bytesToHex(reverseBytes(headerBytes.slice(4, 36)));
  const merkleRoot = bytesToHex(reverseBytes(headerBytes.slice(36, 68)));
  const timestamp = readUInt32LE(headerBytes, 68);
  const bits = readUInt32LE(headerBytes, 72);
  const nonce = readUInt32LE(headerBytes, 76);
  
  const blockHash = bytesToHex(reverseBytes(hash256(headerBytes)));
  
  return {
    header: {
      version,
      prevBlockHash,
      merkleRoot,
      timestamp,
      bits,
      nonce,
      blockHash,
    },
    size: 80,
  };
}

export function calculateMerkleRoot(txids: string[]): string {
  if (txids.length === 0) {
    return '0'.repeat(64);
  }
  
  let level = txids.map(txid => reverseBytes(hexToBytes(txid)));
  
  while (level.length > 1) {
    const nextLevel: Uint8Array[] = [];
    
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      
      const combined = new Uint8Array(64);
      combined.set(left, 0);
      combined.set(right, 32);
      
      const hash = hash256(combined);
      nextLevel.push(hash);
    }
    
    level = nextLevel;
  }
  
  return bytesToHex(reverseBytes(level[0]));
}

export function decodeBIP34Height(scriptSig: Uint8Array): number {
  if (scriptSig.length === 0) {
    return 0;
  }
  
  const firstByte = scriptSig[0];
  
  if (firstByte >= 0x01 && firstByte <= 0x4e) {
    let heightBytes: Uint8Array;
    
    if (firstByte <= 0x4b) {
      heightBytes = scriptSig.slice(1, 1 + firstByte);
    } else {
      return 0;
    }
    
    if (heightBytes.length === 0) {
      return 0;
    }
    
    let height = 0;
    for (let i = 0; i < heightBytes.length && i < 4; i++) {
      height |= heightBytes[i] << (8 * i);
    }
    
    return height;
  }
  
  return 0;
}
