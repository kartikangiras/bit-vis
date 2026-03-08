import { RawTransaction } from '../parser/transaction';

function varintSize(n: number): number {
  if (n < 0xfd) return 1;
  if (n <= 0xffff) return 3;
  if (n <= 0xffffffff) return 5;
  return 9;
}

export interface WeightCalculation {
  size_bytes: number;
  weight: number;
  vbytes: number;
  witness_bytes: number;
  non_witness_bytes: number;
}

export function calculateWeight(tx: RawTransaction, rawTxHex: string): WeightCalculation {
  const totalSize = rawTxHex.length / 2;
  
  if (!tx.segwit) {
    return {
      size_bytes: totalSize,
      weight: totalSize * 4,
      vbytes: totalSize,
      witness_bytes: 0,
      non_witness_bytes: totalSize,
    };
  }
  
  let baseSize = 4;
  baseSize += varintSize(tx.inputs.length);
  
  for (const input of tx.inputs) {
    baseSize += 32;
    baseSize += 4;
    baseSize += varintSize(input.scriptSig.length);
    baseSize += input.scriptSig.length;
    baseSize += 4;
  }
  
  baseSize += varintSize(tx.outputs.length);
  for (const output of tx.outputs) {
    baseSize += 8;
    baseSize += varintSize(output.scriptPubKey.length);
    baseSize += output.scriptPubKey.length;
  }
  
  baseSize += 4;
  
  let witnessSize = 2;
  for (const witnessStack of tx.witnesses) {
    witnessSize += varintSize(witnessStack.length);
    for (const item of witnessStack) {
      witnessSize += varintSize(item.length);
      witnessSize += item.length;
    }
  }
  
  const weight = baseSize * 4 + witnessSize;
  const vbytes = Math.ceil(weight / 4);
  
  return {
    size_bytes: totalSize,
    weight,
    vbytes,
    witness_bytes: witnessSize,
    non_witness_bytes: baseSize,
  };
}
