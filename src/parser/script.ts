import { hexToBytes, bytesToHex, readUInt32LE } from '../utils/hex';
import { readVarInt } from './varint';
import { getOpcodeName } from './opcodes';

export function disassembleScript(scriptHex: string): string {
  if (scriptHex.length === 0) return '';
  
  const bytes = hexToBytes(scriptHex);
  const tokens: string[] = [];
  let i = 0;
  
  while (i < bytes.length) {
    const opcode = bytes[i];
    
    if (opcode >= 0x01 && opcode <= 0x4b) {
      const dataLen = opcode;
      const data = bytes.slice(i + 1, i + 1 + dataLen);
      tokens.push(`OP_PUSHBYTES_${dataLen} ${bytesToHex(data)}`);
      i += 1 + dataLen;
      continue;
    }
    
    if (opcode === 0x4c) {
      const dataLen = bytes[i + 1];
      const data = bytes.slice(i + 2, i + 2 + dataLen);
      tokens.push(`OP_PUSHDATA1 ${bytesToHex(data)}`);
      i += 2 + dataLen;
      continue;
    }
    
    if (opcode === 0x4d) {
      const dataLen = bytes[i + 1] | (bytes[i + 2] << 8);
      const data = bytes.slice(i + 3, i + 3 + dataLen);
      tokens.push(`OP_PUSHDATA2 ${bytesToHex(data)}`);
      i += 3 + dataLen;
      continue;
    }
    
    if (opcode === 0x4e) {
      const dataLen = readUInt32LE(bytes, i + 1);
      const data = bytes.slice(i + 5, i + 5 + dataLen);
      tokens.push(`OP_PUSHDATA4 ${bytesToHex(data)}`);
      i += 5 + dataLen;
      continue;
    }
    
    tokens.push(getOpcodeName(opcode));
    i++;
  }
  
  return tokens.join(' ');
}

export function extractOpReturnData(scriptHex: string): {
  data_hex: string;
  data_utf8: string | null;
  protocol: string;
} {
  if (!scriptHex.startsWith('6a')) {
    return { data_hex: '', data_utf8: null, protocol: 'unknown' };
  }
  
  const bytes = hexToBytes(scriptHex);
  let i = 1;
  let dataHex = '';
  
  while (i < bytes.length) {
    const opcode = bytes[i];
    
    if (opcode >= 0x01 && opcode <= 0x4b) {
      const dataLen = opcode;
      const data = bytes.slice(i + 1, i + 1 + dataLen);
      dataHex += bytesToHex(data);
      i += 1 + dataLen;
      continue;
    }
    
    if (opcode === 0x4c) {
      const dataLen = bytes[i + 1];
      const data = bytes.slice(i + 2, i + 2 + dataLen);
      dataHex += bytesToHex(data);
      i += 2 + dataLen;
      continue;
    }
    
    if (opcode === 0x4d) {
      const dataLen = bytes[i + 1] | (bytes[i + 2] << 8);
      const data = bytes.slice(i + 3, i + 3 + dataLen);
      dataHex += bytesToHex(data);
      i += 3 + dataLen;
      continue;
    }
    
    if (opcode === 0x4e) {
      const dataLen = readUInt32LE(bytes, i + 1);
      const data = bytes.slice(i + 5, i + 5 + dataLen);
      dataHex += bytesToHex(data);
      i += 5 + dataLen;
      continue;
    }
    
    i++;
  }
  
  let dataUtf8: string | null = null;
  if (dataHex.length > 0) {
    try {
      const dataBytes = hexToBytes(dataHex);
      dataUtf8 = Buffer.from(dataBytes).toString('utf8');
      if (!/^[\x20-\x7E\n\r\t]*$/.test(dataUtf8)) {
        dataUtf8 = null;
      }
    } catch {
      dataUtf8 = null;
    }
  }
  
  let protocol = 'unknown';
  if (dataHex.startsWith('6f6d6e69')) {
    protocol = 'omni';
  } else if (dataHex.startsWith('0109f91102')) {
    protocol = 'opentimestamps';
  }
  
  return {
    data_hex: dataHex,
    data_utf8: dataUtf8,
    protocol,
  };
}
