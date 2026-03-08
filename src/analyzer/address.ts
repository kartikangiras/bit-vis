import * as bs58check from 'bs58check';
import { bech32, bech32m } from 'bech32';
import { hexToBytes } from '../utils/hex';
import { classifyOutputScript } from './classifier';

export function generateAddress(
  scriptHex: string,
  network: 'mainnet' | 'testnet' = 'mainnet'
): string | null {
  const scriptType = classifyOutputScript(scriptHex);
  
  switch (scriptType) {
    case 'p2pkh':
      return encodeP2PKH(scriptHex, network);
    case 'p2sh':
      return encodeP2SH(scriptHex, network);
    case 'p2wpkh':
      return encodeP2WPKH(scriptHex, network);
    case 'p2wsh':
      return encodeP2WSH(scriptHex, network);
    case 'p2tr':
      return encodeP2TR(scriptHex, network);
    default:
      return null;
  }
}

function encodeP2PKH(scriptHex: string, network: string): string {
  const hash = scriptHex.slice(6, 46);
  const hashBytes = hexToBytes(hash);
  
  const version = network === 'mainnet' ? 0x00 : 0x6f;
  const payload = Buffer.concat([Buffer.from([version]), Buffer.from(hashBytes)]);
  
  return bs58check.encode(payload);
}

function encodeP2SH(scriptHex: string, network: string): string {
  const hash = scriptHex.slice(4, 44);
  const hashBytes = hexToBytes(hash);
  
  const version = network === 'mainnet' ? 0x05 : 0xc4;
  const payload = Buffer.concat([Buffer.from([version]), Buffer.from(hashBytes)]);
  
  return bs58check.encode(payload);
}

function encodeP2WPKH(scriptHex: string, network: string): string {
  const hash = scriptHex.slice(4);
  const hashBytes = hexToBytes(hash);
  
  const hrp = network === 'mainnet' ? 'bc' : 'tb';
  const words = bech32.toWords(hashBytes);
  return bech32.encode(hrp, [0, ...words]);
}

function encodeP2WSH(scriptHex: string, network: string): string {
  const hash = scriptHex.slice(4);
  const hashBytes = hexToBytes(hash);
  
  const hrp = network === 'mainnet' ? 'bc' : 'tb';
  const words = bech32.toWords(hashBytes);
  return bech32.encode(hrp, [0, ...words]);
}

function encodeP2TR(scriptHex: string, network: string): string {
  const xCoord = scriptHex.slice(4);
  const xCoordBytes = hexToBytes(xCoord);
  
  const hrp = network === 'mainnet' ? 'bc' : 'tb';
  const words = bech32.toWords(xCoordBytes);
  return bech32m.encode(hrp, [1, ...words]);
}
