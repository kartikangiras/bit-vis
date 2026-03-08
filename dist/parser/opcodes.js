"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPCODES = void 0;
exports.getOpcodeName = getOpcodeName;
exports.OPCODES = {
    0x00: 'OP_0',
    0x4c: 'OP_PUSHDATA1',
    0x4d: 'OP_PUSHDATA2',
    0x4e: 'OP_PUSHDATA4',
    0x4f: 'OP_1NEGATE',
    0x50: 'OP_RESERVED',
    0x51: 'OP_1',
    0x52: 'OP_2',
    0x53: 'OP_3',
    0x54: 'OP_4',
    0x55: 'OP_5',
    0x56: 'OP_6',
    0x57: 'OP_7',
    0x58: 'OP_8',
    0x59: 'OP_9',
    0x5a: 'OP_10',
    0x5b: 'OP_11',
    0x5c: 'OP_12',
    0x5d: 'OP_13',
    0x5e: 'OP_14',
    0x5f: 'OP_15',
    0x60: 'OP_16',
    0x61: 'OP_NOP',
    0x6a: 'OP_RETURN',
    0x76: 'OP_DUP',
    0x87: 'OP_EQUAL',
    0x88: 'OP_EQUALVERIFY',
    0xa9: 'OP_HASH160',
    0xac: 'OP_CHECKSIG',
    0xad: 'OP_CHECKSIGVERIFY',
    0xae: 'OP_CHECKMULTISIG',
    0xaf: 'OP_CHECKMULTISIGVERIFY',
};
function getOpcodeName(byte) {
    return exports.OPCODES[byte] || `OP_UNKNOWN_${byte.toString(16).padStart(2, '0')}`;
}
//# sourceMappingURL=opcodes.js.map