"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readXorKey = readXorKey;
exports.xorDecode = xorDecode;
function readXorKey(filePath) {
    const fs = require('fs');
    return new Uint8Array(fs.readFileSync(filePath));
}
function xorDecode(data, key) {
    if (key.length === 0 || (key.length === 1 && key[0] === 0)) {
        return data;
    }
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        result[i] = data[i] ^ key[i % key.length];
    }
    return result;
}
//# sourceMappingURL=xor.js.map