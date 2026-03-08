const RBF_SEQUENCE_THRESHOLD = 0xfffffffe;

export function detectRBF(sequences: number[]): boolean {
  return sequences.some(seq => seq < RBF_SEQUENCE_THRESHOLD);
}

export function analyzeRelativeTimelock(sequence: number): {
  enabled: boolean;
  type?: string;
  value?: number;
} {
  const SEQUENCE_LOCKTIME_DISABLE_FLAG = 1 << 31;
  const SEQUENCE_LOCKTIME_TYPE_FLAG = 1 << 22;
  const SEQUENCE_LOCKTIME_MASK = 0xffff;
  
  if ((sequence & SEQUENCE_LOCKTIME_DISABLE_FLAG) !== 0) {
    return { enabled: false };
  }
  
  const value = sequence & SEQUENCE_LOCKTIME_MASK;
  
  if (value === 0) {
    return { enabled: false };
  }
  
  const isTime = (sequence & SEQUENCE_LOCKTIME_TYPE_FLAG) !== 0;
  
  return {
    enabled: true,
    type: isTime ? 'time' : 'blocks',
    value: value,
  };
}

export function analyzeLocktime(locktime: number): {
  type: string;
  value: number;
} {
  if (locktime === 0) {
    return { type: 'none', value: 0 };
  }
  
  if (locktime < 500000000) {
    return { type: 'block_height', value: locktime };
  }
  
  return { type: 'unix_timestamp', value: locktime };
}
