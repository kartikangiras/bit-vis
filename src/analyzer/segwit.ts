import { SegwitSavings } from '../types';

export function calculateSegwitSavings(
  witnessBytes: number,
  nonWitnessBytes: number,
  totalBytes: number,
  weightActual: number
): SegwitSavings {
  const weightIfLegacy = totalBytes * 4;
  const savingsPct = ((weightIfLegacy - weightActual) / weightIfLegacy) * 100;
  
  return {
    witness_bytes: witnessBytes,
    non_witness_bytes: nonWitnessBytes,
    total_bytes: totalBytes,
    weight_actual: weightActual,
    weight_if_legacy: weightIfLegacy,
    savings_pct: Math.round(savingsPct * 100) / 100,
  };
}
