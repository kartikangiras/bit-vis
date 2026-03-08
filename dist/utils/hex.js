"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexToBytes = hexToBytes;
exports.bytesToHex = bytesToHex;
exports.readUInt32LE = readUInt32LE;
exports.readUInt64LE = readUInt64LE;
exports.reverseBytes = reverseBytes;
function hexToBytes(hex) {
    // Strip any whitespace (spaces, newlines, tabs) from copy-paste
    hex = hex.replace(/\s+/g, '');
    if (hex.length % 2 !== 0) {
        throw new Error('Invalid hex string length');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}
function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
function readUInt32LE(bytes, offset) {
    return (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)) >>> 0;
}
function readUInt64LE(bytes, offset) {
    const low = readUInt32LE(bytes, offset);
    const high = readUInt32LE(bytes, offset + 4);
    return BigInt(high) * (2n ** 32n) + BigInt(low);
}
function reverseBytes(bytes) {
    return new Uint8Array([...bytes].reverse());
}
//# sourceMappingURL=hex.js.map