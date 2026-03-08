export interface RawInput {
    txid: string;
    vout: number;
    scriptSig: Uint8Array;
    sequence: number;
}
export interface RawOutput {
    value: bigint;
    scriptPubKey: Uint8Array;
}
export interface RawTransaction {
    version: number;
    segwit: boolean;
    inputs: RawInput[];
    outputs: RawOutput[];
    witnesses: Uint8Array[][];
    locktime: number;
}
export declare function parseRawTransaction(rawTxHex: string): RawTransaction;
export declare function computeTxid(tx: RawTransaction): string;
export declare function computeWtxid(tx: RawTransaction, rawBytes: Uint8Array): string;
//# sourceMappingURL=transaction.d.ts.map