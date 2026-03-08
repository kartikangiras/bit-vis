export declare function detectRBF(sequences: number[]): boolean;
export declare function analyzeRelativeTimelock(sequence: number): {
    enabled: boolean;
    type?: string;
    value?: number;
};
export declare function analyzeLocktime(locktime: number): {
    type: string;
    value: number;
};
//# sourceMappingURL=timelocks.d.ts.map