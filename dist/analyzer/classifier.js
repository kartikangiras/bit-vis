"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyOutputScript = classifyOutputScript;
exports.classifyInputScript = classifyInputScript;
function classifyOutputScript(scriptHex) {
    const len = scriptHex.length;
    if (len === 50 &&
        scriptHex.startsWith('76a914') &&
        scriptHex.endsWith('88ac')) {
        return 'p2pkh';
    }
    if (len === 46 &&
        scriptHex.startsWith('a914') &&
        scriptHex.endsWith('87')) {
        return 'p2sh';
    }
    if (len === 44 && scriptHex.startsWith('0014')) {
        return 'p2wpkh';
    }
    if (len === 68 && scriptHex.startsWith('0020')) {
        return 'p2wsh';
    }
    if (len === 68 && scriptHex.startsWith('5120')) {
        return 'p2tr';
    }
    if (scriptHex.startsWith('6a')) {
        return 'op_return';
    }
    return 'unknown';
}
function classifyInputScript(scriptSigHex, witness, prevoutScriptHex) {
    const prevoutType = classifyOutputScript(prevoutScriptHex);
    if (prevoutType === 'p2pkh') {
        return 'p2pkh';
    }
    if (prevoutType === 'p2wpkh') {
        return 'p2wpkh';
    }
    if (prevoutType === 'p2wsh') {
        return 'p2wsh';
    }
    if (prevoutType === 'p2tr') {
        if (witness.length === 1) {
            return 'p2tr_keypath';
        }
        else if (witness.length > 1) {
            return 'p2tr_scriptpath';
        }
    }
    if (prevoutType === 'p2sh') {
        if (scriptSigHex.length > 0 && witness.length > 0) {
            const scriptSigBytes = scriptSigHex.length / 2;
            if (scriptSigBytes === 23 && scriptSigHex.startsWith('16')) {
                return 'p2sh-p2wpkh';
            }
            else if (scriptSigBytes === 35 && scriptSigHex.startsWith('22')) {
                return 'p2sh-p2wsh';
            }
        }
        return 'unknown';
    }
    return 'unknown';
}
//# sourceMappingURL=classifier.js.map