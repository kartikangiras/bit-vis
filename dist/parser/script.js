"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disassembleScript = disassembleScript;
exports.extractOpReturnData = extractOpReturnData;
const hex_1 = require("../utils/hex");
const opcodes_1 = require("./opcodes");
function disassembleScript(scriptHex) {
    if (scriptHex.length === 0)
        return '';
    const bytes = (0, hex_1.hexToBytes)(scriptHex);
    const tokens = [];
    let i = 0;
    while (i < bytes.length) {
        const opcode = bytes[i];
        if (opcode >= 0x01 && opcode <= 0x4b) {
            const dataLen = opcode;
            const data = bytes.slice(i + 1, i + 1 + dataLen);
            tokens.push(`OP_PUSHBYTES_${dataLen} ${(0, hex_1.bytesToHex)(data)}`);
            i += 1 + dataLen;
            continue;
        }
        if (opcode === 0x4c) {
            const dataLen = bytes[i + 1];
            const data = bytes.slice(i + 2, i + 2 + dataLen);
            tokens.push(`OP_PUSHDATA1 ${(0, hex_1.bytesToHex)(data)}`);
            i += 2 + dataLen;
            continue;
        }
        if (opcode === 0x4d) {
            const dataLen = bytes[i + 1] | (bytes[i + 2] << 8);
            const data = bytes.slice(i + 3, i + 3 + dataLen);
            tokens.push(`OP_PUSHDATA2 ${(0, hex_1.bytesToHex)(data)}`);
            i += 3 + dataLen;
            continue;
        }
        if (opcode === 0x4e) {
            const dataLen = (0, hex_1.readUInt32LE)(bytes, i + 1);
            const data = bytes.slice(i + 5, i + 5 + dataLen);
            tokens.push(`OP_PUSHDATA4 ${(0, hex_1.bytesToHex)(data)}`);
            i += 5 + dataLen;
            continue;
        }
        tokens.push((0, opcodes_1.getOpcodeName)(opcode));
        i++;
    }
    return tokens.join(' ');
}
function extractOpReturnData(scriptHex) {
    if (!scriptHex.startsWith('6a')) {
        return { data_hex: '', data_utf8: null, protocol: 'unknown' };
    }
    const bytes = (0, hex_1.hexToBytes)(scriptHex);
    let i = 1;
    let dataHex = '';
    while (i < bytes.length) {
        const opcode = bytes[i];
        if (opcode >= 0x01 && opcode <= 0x4b) {
            const dataLen = opcode;
            const data = bytes.slice(i + 1, i + 1 + dataLen);
            dataHex += (0, hex_1.bytesToHex)(data);
            i += 1 + dataLen;
            continue;
        }
        if (opcode === 0x4c) {
            const dataLen = bytes[i + 1];
            const data = bytes.slice(i + 2, i + 2 + dataLen);
            dataHex += (0, hex_1.bytesToHex)(data);
            i += 2 + dataLen;
            continue;
        }
        if (opcode === 0x4d) {
            const dataLen = bytes[i + 1] | (bytes[i + 2] << 8);
            const data = bytes.slice(i + 3, i + 3 + dataLen);
            dataHex += (0, hex_1.bytesToHex)(data);
            i += 3 + dataLen;
            continue;
        }
        if (opcode === 0x4e) {
            const dataLen = (0, hex_1.readUInt32LE)(bytes, i + 1);
            const data = bytes.slice(i + 5, i + 5 + dataLen);
            dataHex += (0, hex_1.bytesToHex)(data);
            i += 5 + dataLen;
            continue;
        }
        i++;
    }
    let dataUtf8 = null;
    if (dataHex.length > 0) {
        try {
            const dataBytes = (0, hex_1.hexToBytes)(dataHex);
            dataUtf8 = Buffer.from(dataBytes).toString('utf8');
            if (!/^[\x20-\x7E\n\r\t]*$/.test(dataUtf8)) {
                dataUtf8 = null;
            }
        }
        catch {
            dataUtf8 = null;
        }
    }
    let protocol = 'unknown';
    if (dataHex.startsWith('6f6d6e69')) {
        protocol = 'omni';
    }
    else if (dataHex.startsWith('0109f91102')) {
        protocol = 'opentimestamps';
    }
    return {
        data_hex: dataHex,
        data_utf8: dataUtf8,
        protocol,
    };
}
//# sourceMappingURL=script.js.map