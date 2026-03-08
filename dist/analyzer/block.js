"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeBlocks = analyzeBlocks;
const fs = __importStar(require("fs"));
const block_1 = require("../parser/block");
const transaction_1 = require("../parser/transaction");
const undo_1 = require("../parser/undo");
const xor_1 = require("../parser/xor");
const analyzer_1 = require("../analyzer");
const varint_1 = require("../parser/varint");
const hex_1 = require("../utils/hex");
function reverseHex(hex) {
    return hex.match(/.{2}/g)?.reverse().join('') || hex;
}
function analyzeBlocks(blkPath, revPath, xorPath) {
    const xorKey = (0, xor_1.readXorKey)(xorPath);
    const blkData = fs.readFileSync(blkPath);
    const revData = fs.readFileSync(revPath);
    const decodedBlk = (0, xor_1.xorDecode)(new Uint8Array(blkData), xorKey);
    const decodedRev = (0, xor_1.xorDecode)(new Uint8Array(revData), xorKey);
    const blocks = parseBlockFile(decodedBlk);
    const undoBlocks = (0, undo_1.parseUndoData)(decodedRev);
    const results = [];
    for (let blockIdx = 0; blockIdx < Math.min(blocks.length, 1); blockIdx++) {
        const block = blocks[blockIdx];
        const blockHash = block.header.blockHash;
        try {
            const blockUndos = undoBlocks[blockIdx] || [];
            const txAnalyses = [];
            const allTxids = block.rawTransactions.map((rawTx) => (0, transaction_1.computeTxid)(rawTx));
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
                const prevouts = [];
                if (txIdx === 0) {
                    for (const input of rawTx.inputs) {
                        prevouts.push({
                            txid: input.txid,
                            vout: input.vout,
                            value_sats: 0,
                            script_pubkey_hex: '',
                        });
                    }
                }
                else {
                    const txUndo = blockUndos[txIdx - 1] || [];
                    let undoIdx = 0;
                    for (const input of rawTx.inputs) {
                        let prevTx;
                        if (blockTxMap.has(input.txid)) {
                            prevTx = blockTxMap.get(input.txid);
                        }
                        else if (blockTxMap.has(reverseHex(input.txid))) {
                            prevTx = blockTxMap.get(reverseHex(input.txid));
                        }
                        if (prevTx) {
                            const prevOutput = prevTx.outputs[input.vout];
                            prevouts.push({
                                txid: input.txid,
                                vout: input.vout,
                                value_sats: Number(prevOutput.value),
                                script_pubkey_hex: (0, hex_1.bytesToHex)(prevOutput.scriptPubKey),
                            });
                        }
                        else {
                            const undo = txUndo[undoIdx++];
                            prevouts.push({
                                txid: input.txid,
                                vout: input.vout,
                                value_sats: undo ? Number(undo.value) : 0,
                                script_pubkey_hex: undo ? (0, hex_1.bytesToHex)(undo.scriptPubKey) : '',
                            });
                        }
                    }
                }
                const fixture = {
                    network: 'mainnet',
                    raw_tx: rawTxHex,
                    prevouts,
                };
                const analysis = (0, analyzer_1.analyzeTransaction)(fixture);
                if (analysis.ok) {
                    txAnalyses.push(analysis);
                }
            }
            const computedMerkleRoot = (0, block_1.calculateMerkleRoot)(allTxids);
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
            const bip34Height = (0, block_1.decodeBIP34Height)(coinbaseTx.inputs[0].scriptSig);
            const coinbaseScriptHex = (0, hex_1.bytesToHex)(coinbaseTx.inputs[0].scriptSig);
            const coinbaseTotalOutput = txAnalyses[0]?.total_output_sats || 0;
            let totalFees = 0;
            let totalWeight = 0;
            let segwitTxCount = 0;
            const scriptTypeCounts = {};
            for (let i = 1; i < txAnalyses.length; i++) {
                const tx = txAnalyses[i];
                if (tx.fee_sats >= 0)
                    totalFees += tx.fee_sats;
                totalWeight += tx.weight;
                if (tx.segwit)
                    segwitTxCount++;
                for (const out of tx.vout) {
                    const t = out.script_type;
                    scriptTypeCounts[t] = (scriptTypeCounts[t] || 0) + 1;
                }
            }
            const avgFeeRate = totalWeight > 0 ? (totalFees / (totalWeight / 4)) : 0;
            const blockAnalysis = {
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
        }
        catch (err) {
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
function parseBlockFile(bytes) {
    const blocks = [];
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
        const headerResult = (0, block_1.parseBlockHeader)(bytes, offset);
        offset += headerResult.size;
        const txCountResult = (0, varint_1.readVarInt)(bytes, offset);
        offset += txCountResult.size;
        const txCount = txCountResult.value;
        const transactions = [];
        const rawTransactions = [];
        for (let i = 0; i < txCount; i++) {
            const txStart = offset;
            const version = bytes.slice(offset, offset + 4);
            offset += 4;
            let segwit = false;
            if (bytes[offset] === 0x00 && bytes[offset + 1] === 0x01) {
                segwit = true;
                offset += 2;
            }
            const inputCountResult = (0, varint_1.readVarInt)(bytes, offset);
            offset += inputCountResult.size;
            const inputCount = inputCountResult.value;
            for (let j = 0; j < inputCount; j++) {
                offset += 32;
                offset += 4;
                const scriptSigLenResult = (0, varint_1.readVarInt)(bytes, offset);
                offset += scriptSigLenResult.size;
                offset += scriptSigLenResult.value;
                offset += 4;
            }
            const outputCountResult = (0, varint_1.readVarInt)(bytes, offset);
            offset += outputCountResult.size;
            const outputCount = outputCountResult.value;
            for (let j = 0; j < outputCount; j++) {
                offset += 8;
                const scriptPubKeyLenResult = (0, varint_1.readVarInt)(bytes, offset);
                offset += scriptPubKeyLenResult.size;
                offset += scriptPubKeyLenResult.value;
            }
            if (segwit) {
                for (let j = 0; j < inputCount; j++) {
                    const witnessCountResult = (0, varint_1.readVarInt)(bytes, offset);
                    offset += witnessCountResult.size;
                    const witnessCount = witnessCountResult.value;
                    for (let k = 0; k < witnessCount; k++) {
                        const itemLenResult = (0, varint_1.readVarInt)(bytes, offset);
                        offset += itemLenResult.size;
                        offset += itemLenResult.value;
                    }
                }
            }
            offset += 4;
            const txBytes = bytes.slice(txStart, offset);
            const txHex = (0, hex_1.bytesToHex)(txBytes);
            transactions.push(txHex);
            const rawTx = (0, transaction_1.parseRawTransaction)(txHex);
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
//# sourceMappingURL=block.js.map