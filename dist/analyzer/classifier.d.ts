export type ScriptType = 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr' | 'op_return' | 'unknown';
export declare function classifyOutputScript(scriptHex: string): ScriptType;
export declare function classifyInputScript(scriptSigHex: string, witness: string[], prevoutScriptHex: string): string;
//# sourceMappingURL=classifier.d.ts.map