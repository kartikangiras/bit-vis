"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRawTransaction = parseRawTransaction;
exports.computeTxid = computeTxid;
exports.computeWtxid = computeWtxid;
const hex_1 = require("../utils/hex");
const varint_1 = require("./varint");
const hash_1 = require("../utils/hash");
function parseRawTransaction(rawTxHex) {
    const bytes = (0, hex_1.hexToBytes)(rawTxHex);
    let offset = 0;
    const version = (0, hex_1.readUInt32LE)(bytes, offset);
    offset += 4;
    let segwit = false;
    if (bytes[offset] === 0x00 && bytes[offset + 1] === 0x01) {
        segwit = true;
        offset += 2;
    }
    const inputCountResult = (0, varint_1.readVarInt)(bytes, offset);
    offset += inputCountResult.size;
    const inputCount = inputCountResult.value;
    const inputs = [];
    for (let i = 0; i < inputCount; i++) {
        const txidBytes = bytes.slice(offset, offset + 32);
        const txid = (0, hex_1.bytesToHex)((0, hex_1.reverseBytes)(txidBytes));
        offset += 32;
        const vout = (0, hex_1.readUInt32LE)(bytes, offset);
        offset += 4;
        const scriptSigLenResult = (0, varint_1.readVarInt)(bytes, offset);
        offset += scriptSigLenResult.size;
        const scriptSigLen = scriptSigLenResult.value;
        const scriptSig = bytes.slice(offset, offset + scriptSigLen);
        offset += scriptSigLen;
        const sequence = (0, hex_1.readUInt32LE)(bytes, offset);
        offset += 4;
        inputs.push({ txid, vout, scriptSig, sequence });
    }
    const outputCountResult = (0, varint_1.readVarInt)(bytes, offset);
    offset += outputCountResult.size;
    const outputCount = outputCountResult.value;
    const outputs = [];
    for (let i = 0; i < outputCount; i++) {
        const value = (0, hex_1.readUInt64LE)(bytes, offset);
        offset += 8;
        const scriptPubKeyLenResult = (0, varint_1.readVarInt)(bytes, offset);
        offset += scriptPubKeyLenResult.size;
        const scriptPubKeyLen = scriptPubKeyLenResult.value;
        const scriptPubKey = bytes.slice(offset, offset + scriptPubKeyLen);
        offset += scriptPubKeyLen;
        outputs.push({ value, scriptPubKey });
    }
    const witnesses = [];
    if (segwit) {
        for (let i = 0; i < inputCount; i++) {
            const witnessItemCountResult = (0, varint_1.readVarInt)(bytes, offset);
            offset += witnessItemCountResult.size;
            const witnessItemCount = witnessItemCountResult.value;
            const witnessStack = [];
            for (let j = 0; j < witnessItemCount; j++) {
                const itemLenResult = (0, varint_1.readVarInt)(bytes, offset);
                offset += itemLenResult.size;
                const itemLen = itemLenResult.value;
                const item = bytes.slice(offset, offset + itemLen);
                offset += itemLen;
                witnessStack.push(item);
            }
            witnesses.push(witnessStack);
        }
    }
    const locktime = (0, hex_1.readUInt32LE)(bytes, offset);
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
function uint32LE(value) {
    const b = new Uint8Array(4);
    b[0] = value & 0xff;
    b[1] = (value >>> 8) & 0xff;
    b[2] = (value >>> 16) & 0xff;
    b[3] = (value >>> 24) & 0xff;
    return b;
}
function uint64LE(value) {
    const b = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        b[i] = Number((value >> BigInt(8 * i)) & 0xffn);
    }
    return b;
}
function serializeNonWitness(tx) {
    const parts = [];
    parts.push(uint32LE(tx.version));
    parts.push((0, varint_1.writeVarInt)(tx.inputs.length));
    for (const inp of tx.inputs) {
        parts.push((0, hex_1.reverseBytes)((0, hex_1.hexToBytes)(inp.txid)));
        parts.push(uint32LE(inp.vout));
        parts.push((0, varint_1.writeVarInt)(inp.scriptSig.length));
        parts.push(inp.scriptSig);
        parts.push(uint32LE(inp.sequence));
    }
    parts.push((0, varint_1.writeVarInt)(tx.outputs.length));
    for (const out of tx.outputs) {
        parts.push(uint64LE(out.value));
        parts.push((0, varint_1.writeVarInt)(out.scriptPubKey.length));
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
function computeTxid(tx) {
    const serialized = serializeNonWitness(tx);
    return (0, hex_1.bytesToHex)((0, hex_1.reverseBytes)((0, hash_1.hash256)(serialized)));
}
function computeWtxid(tx, rawBytes) {
    return (0, hex_1.bytesToHex)((0, hex_1.reverseBytes)((0, hash_1.hash256)(rawBytes)));
}
//# sourceMappingURL=transaction.js.map