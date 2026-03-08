"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBlockHeader = parseBlockHeader;
exports.calculateMerkleRoot = calculateMerkleRoot;
exports.decodeBIP34Height = decodeBIP34Height;
const hex_1 = require("../utils/hex");
const hash_1 = require("../utils/hash");
function parseBlockHeader(bytes, offset) {
    const headerBytes = bytes.slice(offset, offset + 80);
    const version = (0, hex_1.readUInt32LE)(headerBytes, 0);
    const prevBlockHash = (0, hex_1.bytesToHex)((0, hex_1.reverseBytes)(headerBytes.slice(4, 36)));
    const merkleRoot = (0, hex_1.bytesToHex)((0, hex_1.reverseBytes)(headerBytes.slice(36, 68)));
    const timestamp = (0, hex_1.readUInt32LE)(headerBytes, 68);
    const bits = (0, hex_1.readUInt32LE)(headerBytes, 72);
    const nonce = (0, hex_1.readUInt32LE)(headerBytes, 76);
    const blockHash = (0, hex_1.bytesToHex)((0, hex_1.reverseBytes)((0, hash_1.hash256)(headerBytes)));
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
function calculateMerkleRoot(txids) {
    if (txids.length === 0) {
        return '0'.repeat(64);
    }
    let level = txids.map(txid => (0, hex_1.reverseBytes)((0, hex_1.hexToBytes)(txid)));
    while (level.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = i + 1 < level.length ? level[i + 1] : level[i];
            const combined = new Uint8Array(64);
            combined.set(left, 0);
            combined.set(right, 32);
            const hash = (0, hash_1.hash256)(combined);
            nextLevel.push(hash);
        }
        level = nextLevel;
    }
    return (0, hex_1.bytesToHex)((0, hex_1.reverseBytes)(level[0]));
}
function decodeBIP34Height(scriptSig) {
    if (scriptSig.length === 0) {
        return 0;
    }
    const firstByte = scriptSig[0];
    if (firstByte >= 0x01 && firstByte <= 0x4e) {
        let heightBytes;
        if (firstByte <= 0x4b) {
            heightBytes = scriptSig.slice(1, 1 + firstByte);
        }
        else {
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
//# sourceMappingURL=block.js.map