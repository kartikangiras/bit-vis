export interface BlockHeader {
    version: number;
    prevBlockHash: string;
    merkleRoot: string;
    timestamp: number;
    bits: number;
    nonce: number;
    blockHash: string;
}
export declare function parseBlockHeader(bytes: Uint8Array, offset: number): {
    header: BlockHeader;
    size: number;
};
export declare function calculateMerkleRoot(txids: string[]): string;
export declare function decodeBIP34Height(scriptSig: Uint8Array): number;
//# sourceMappingURL=block.d.ts.map