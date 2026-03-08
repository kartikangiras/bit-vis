import { RawTransaction } from '../parser/transaction';
export interface WeightCalculation {
    size_bytes: number;
    weight: number;
    vbytes: number;
    witness_bytes: number;
    non_witness_bytes: number;
}
export declare function calculateWeight(tx: RawTransaction, rawTxHex: string): WeightCalculation;
//# sourceMappingURL=weight.d.ts.map