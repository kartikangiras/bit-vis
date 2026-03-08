export interface UndoRecord {
    height: number;
    isCoinbase: boolean;
    value: bigint;
    scriptPubKey: Uint8Array;
}
export declare function parseUndoData(bytes: Uint8Array): UndoRecord[][][];
//# sourceMappingURL=undo.d.ts.map