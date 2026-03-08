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
exports.generateAddress = generateAddress;
const bs58check = __importStar(require("bs58check"));
const bech32_1 = require("bech32");
const hex_1 = require("../utils/hex");
const classifier_1 = require("./classifier");
function generateAddress(scriptHex, network = 'mainnet') {
    const scriptType = (0, classifier_1.classifyOutputScript)(scriptHex);
    switch (scriptType) {
        case 'p2pkh':
            return encodeP2PKH(scriptHex, network);
        case 'p2sh':
            return encodeP2SH(scriptHex, network);
        case 'p2wpkh':
            return encodeP2WPKH(scriptHex, network);
        case 'p2wsh':
            return encodeP2WSH(scriptHex, network);
        case 'p2tr':
            return encodeP2TR(scriptHex, network);
        default:
            return null;
    }
}
function encodeP2PKH(scriptHex, network) {
    const hash = scriptHex.slice(6, 46);
    const hashBytes = (0, hex_1.hexToBytes)(hash);
    const version = network === 'mainnet' ? 0x00 : 0x6f;
    const payload = Buffer.concat([Buffer.from([version]), Buffer.from(hashBytes)]);
    return bs58check.encode(payload);
}
function encodeP2SH(scriptHex, network) {
    const hash = scriptHex.slice(4, 44);
    const hashBytes = (0, hex_1.hexToBytes)(hash);
    const version = network === 'mainnet' ? 0x05 : 0xc4;
    const payload = Buffer.concat([Buffer.from([version]), Buffer.from(hashBytes)]);
    return bs58check.encode(payload);
}
function encodeP2WPKH(scriptHex, network) {
    const hash = scriptHex.slice(4);
    const hashBytes = (0, hex_1.hexToBytes)(hash);
    const hrp = network === 'mainnet' ? 'bc' : 'tb';
    const words = bech32_1.bech32.toWords(hashBytes);
    return bech32_1.bech32.encode(hrp, [0, ...words]);
}
function encodeP2WSH(scriptHex, network) {
    const hash = scriptHex.slice(4);
    const hashBytes = (0, hex_1.hexToBytes)(hash);
    const hrp = network === 'mainnet' ? 'bc' : 'tb';
    const words = bech32_1.bech32.toWords(hashBytes);
    return bech32_1.bech32.encode(hrp, [0, ...words]);
}
function encodeP2TR(scriptHex, network) {
    const xCoord = scriptHex.slice(4);
    const xCoordBytes = (0, hex_1.hexToBytes)(xCoord);
    const hrp = network === 'mainnet' ? 'bc' : 'tb';
    const words = bech32_1.bech32.toWords(xCoordBytes);
    return bech32_1.bech32m.encode(hrp, [1, ...words]);
}
//# sourceMappingURL=address.js.map