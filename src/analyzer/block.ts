import * as fs from 'fs';
import { parseBlockHeader, calculateMerkleRoot, decodeBIP34Height } from '../parser/block';
import { parseRawTransaction, computeTxid } from '../parser/transaction';
import { parseUndoData } from '../parser/undo';
import { readXorKey, xorDecode } from '../parser/xor';
import { analyzeTransaction } from '../analyzer';
import { readVarInt } from '../parser/varint';
import { bytesToHex } from '../utils/hex';
import { BlockAnalysis, BlockError, TransactionAnalysis, PrevoutData } from '../types';

interface BlockData {
  header: any;
  transactions: string[];
  rawTransactions: any[];
}

function reverseHex(hex: string): string {
  return hex.match(/.{2}/g)?.reverse().join('') || hex;
}

export function analyzeBlocks(blkPath: string, revPath: string, xorPath: string): (BlockAnalysis | BlockError)[] {
  const xorKey = readXorKey(xorPath);
  const blkData = fs.readFileSync(blkPath);
  const revData = fs.readFileSync(revPath);
  
  const decodedBlk = xorDecode(new Uint8Array(blkData), xorKey);
  const decodedRev = xorDecode(new Uint8Array(revData), xorKey);
  
  const blocks = parseBlockFile(decodedBlk);
  const undoBlocks = parseUndoData(decodedRev);
  
  const results: (BlockAnalysis | BlockError)[] = [];
  
  for (let blockIdx = 0; blockIdx < Math.min(blocks.length, 1); blockIdx++) {
    const block = blocks[blockIdx];
    const blockHash = block.header.blockHash as string;

    try {
      const blockUndos = undoBlocks[blockIdx] || [];
      const txAnalyses: TransactionAnalysis[] = [];

      const allTxids = block.rawTransactions.map((rawTx: any) => computeTxid(rawTx));
      
      const blockTxMap = new Map();
      for (let i = 0; i < allTxids.length; i++) {
        const txid = allTxids[i];
        const tx = block.rawTransactions[i];
        blockTxMap.set(txid, tx);
        blockTxMap.set(reverseHex(txid), tx); 
      }
      
      for (let txIdx = 0; txIdx < block.transactions.length; txIdx++) {
        const rawTxHex = block.transactions[txIdx];
        const rawTx = block.rawTransactions[txIdx];
        
        const prevouts: PrevoutData[] = [];
        
        if (txIdx === 0) {
          for (const input of rawTx.inputs) {
            prevouts.push({
              txid: input.txid,
              vout: input.vout,
              value_sats: 0,
              script_pubkey_hex: '',
            });
          }
        } else {
          const txUndo = blockUndos[txIdx - 1] || [];
          let undoIdx = 0;
          
          for (const input of rawTx.inputs) {
            let prevTx;
            
            if (blockTxMap.has(input.txid)) {
              prevTx = blockTxMap.get(input.txid);
            } else if (blockTxMap.has(reverseHex(input.txid))) {
              prevTx = blockTxMap.get(reverseHex(input.txid));
            }

            if (prevTx) {
              const prevOutput = prevTx.outputs[input.vout];
              prevouts.push({
                txid: input.txid,
                vout: input.vout,
                value_sats: Number(prevOutput.value),
                script_pubkey_hex: bytesToHex(prevOutput.scriptPubKey),
              });
            } else {
              const undo = txUndo[undoIdx++];
              prevouts.push({
                txid: input.txid,
                vout: input.vout,
                value_sats: undo ? Number(undo.value) : 0,
                script_pubkey_hex: undo ? bytesToHex(undo.scriptPubKey) : '',
              });
            }
          }
        }
        
        const fixture = {
          network: 'mainnet',
          raw_tx: rawTxHex,
          prevouts,
        };
        
        const analysis = analyzeTransaction(fixture);
        if (analysis.ok) {
          txAnalyses.push(analysis as TransactionAnalysis);
        }
      }
      
      const computedMerkleRoot = calculateMerkleRoot(allTxids);
      const merkleRootValid = computedMerkleRoot === block.header.merkleRoot;

      if (!merkleRootValid) {
        results.push({
          ok: false,
          block_hash: blockHash,
          error: {
            code: 'INVALID_MERKLE_ROOT',
            message: `Merkle root mismatch: computed ${computedMerkleRoot}, expected ${block.header.merkleRoot}`,
          },
        });
        continue;
      }
      
      const coinbaseTx = block.rawTransactions[0];
      const bip34Height = decodeBIP34Height(coinbaseTx.inputs[0].scriptSig);
      const coinbaseScriptHex = bytesToHex(coinbaseTx.inputs[0].scriptSig);
      const coinbaseTotalOutput = txAnalyses[0]?.total_output_sats || 0;
      
      let totalFees = 0;
      let totalWeight = 0;
      let segwitTxCount = 0;
      const scriptTypeCounts: { [key: string]: number } = {};
      
      for (let i = 1; i < txAnalyses.length; i++) {
        const tx = txAnalyses[i];
        if (tx.fee_sats >= 0) totalFees += tx.fee_sats;
        totalWeight += tx.weight;
        if (tx.segwit) segwitTxCount++;
        for (const out of tx.vout) {
          const t = out.script_type;
          scriptTypeCounts[t] = (scriptTypeCounts[t] || 0) + 1;
        }
      }
      
      const avgFeeRate = totalWeight > 0 ? (totalFees / (totalWeight / 4)) : 0;
      
      const blockAnalysis: BlockAnalysis = {
        ok: true,
        mode: 'block',
        block_header: {
          version: block.header.version,
          prev_block_hash: block.header.prevBlockHash,
          merkle_root: block.header.merkleRoot,
          merkle_root_valid: merkleRootValid,
          timestamp: block.header.timestamp,
          bits: block.header.bits.toString(16).padStart(8, '0'),
          nonce: block.header.nonce,
          block_hash: block.header.blockHash,
        },
        tx_count: txAnalyses.length,
        coinbase: {
          bip34_height: bip34Height,
          coinbase_script_hex: coinbaseScriptHex,
          total_output_sats: coinbaseTotalOutput,
        },
        transactions: txAnalyses,
        block_stats: {
          total_fees_sats: totalFees,
          total_weight: totalWeight,
          avg_fee_rate_sat_vb: Math.round(avgFeeRate * 100) / 100,
          script_type_summary: scriptTypeCounts,
          segwit_tx_count: segwitTxCount,
        },
      };
      
      results.push(blockAnalysis);
    } catch (err: any) {
      results.push({
        ok: false,
        block_hash: blockHash,
        error: {
          code: 'BLOCK_PARSE_ERROR',
          message: err.message || 'Failed to parse block',
        },
      });
    }
  }
  
  return results;
}

function parseBlockFile(bytes: Uint8Array): BlockData[] {
  const blocks: BlockData[] = [];
  let offset = 0;
  
  while (offset < bytes.length - 80) {
    const magic = bytes.slice(offset, offset + 4);
    if (magic[0] !== 0xf9 || magic[1] !== 0xbe || magic[2] !== 0xb4 || magic[3] !== 0xd9) {
      offset++;
      continue;
    }
    offset += 4;
    
    const blockSize = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
    offset += 4;
    
    const blockStart = offset;
    const headerResult = parseBlockHeader(bytes, offset);
    offset += headerResult.size;
    
    const txCountResult = readVarInt(bytes, offset);
    offset += txCountResult.size;
    const txCount = txCountResult.value;
    
    const transactions: string[] = [];
    const rawTransactions: any[] = [];
    
    for (let i = 0; i < txCount; i++) {
      const txStart = offset;
      
      const version = bytes.slice(offset, offset + 4);
      offset += 4;
      
      let segwit = false;
      if (bytes[offset] === 0x00 && bytes[offset + 1] === 0x01) {
        segwit = true;
        offset += 2;
      }
      
      const inputCountResult = readVarInt(bytes, offset);
      offset += inputCountResult.size;
      const inputCount = inputCountResult.value;
      
      for (let j = 0; j < inputCount; j++) {
        offset += 32;
        offset += 4;
        const scriptSigLenResult = readVarInt(bytes, offset);
        offset += scriptSigLenResult.size;
        offset += scriptSigLenResult.value;
        offset += 4;
      }
      
      const outputCountResult = readVarInt(bytes, offset);
      offset += outputCountResult.size;
      const outputCount = outputCountResult.value;
      
      for (let j = 0; j < outputCount; j++) {
        offset += 8;
        const scriptPubKeyLenResult = readVarInt(bytes, offset);
        offset += scriptPubKeyLenResult.size;
        offset += scriptPubKeyLenResult.value;
      }
      
      if (segwit) {
        for (let j = 0; j < inputCount; j++) {
          const witnessCountResult = readVarInt(bytes, offset);
          offset += witnessCountResult.size;
          const witnessCount = witnessCountResult.value;
          
          for (let k = 0; k < witnessCount; k++) {
            const itemLenResult = readVarInt(bytes, offset);
            offset += itemLenResult.size;
            offset += itemLenResult.value;
          }
        }
      }
      
      offset += 4;
      
      const txBytes = bytes.slice(txStart, offset);
      const txHex = bytesToHex(txBytes);
      transactions.push(txHex);
      
      const rawTx = parseRawTransaction(txHex);
      rawTransactions.push(rawTx);
    }
    
    blocks.push({
      header: headerResult.header,
      transactions,
      rawTransactions,
    });
    break;
  }
  
  return blocks;
}