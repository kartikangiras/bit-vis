export interface VarIntResult {
    value: number;
    size: number;
}
export declare function readVarInt(bytes: Uint8Array, offset: number): VarIntResult;
export declare function writeVarInt(value: number): Uint8Array;
//# sourceMappingURL=varint.d.ts.map