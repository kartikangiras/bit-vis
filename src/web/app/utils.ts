export const sats = (n: number | undefined | null): string =>
  n != null ? `${Number(n).toLocaleString()} sats` : '—';

export const btc = (n: number | undefined | null): string =>
  n != null ? `${(Number(n) / 1e8).toFixed(8)} BTC` : '—';

export const truncate = (s: string | null | undefined, n = 12): string => {
  if (!s) return '—';
  return s.length > n * 2 + 3 ? s.slice(0, n) + '…' + s.slice(-n) : s;
};

export const scriptTypeFriendly = (t: string): string => {
  const map: Record<string, string> = {
    p2pkh:          'Classic Bitcoin',
    p2sh:           'Script Address',
    p2wpkh:         'Modern Bitcoin',
    p2wsh:          'Modern Script',
    p2tr:           'Taproot (newest)',
    p2tr_keypath:   'Taproot Key',
    p2tr_scriptpath:'Taproot Script',
    'p2sh-p2wpkh':  'Wrapped SegWit',
    'p2sh-p2wsh':   'Wrapped Script',
    op_return:      'Data Embed',
    unknown:        'Unknown',
  };
  return map[t] ?? t;
};

export const scriptTypeLabel = (t: string): string => {
  const map: Record<string, string> = {
    p2pkh: 'P2PKH',
    p2sh: 'P2SH',
    p2wpkh: 'P2WPKH',
    p2wsh: 'P2WSH',
    p2tr: 'Taproot',
    p2tr_keypath: 'Taproot Key',
    p2tr_scriptpath: 'Taproot Script',
    'p2sh-p2wpkh': 'P2SH-P2WPKH',
    'p2sh-p2wsh': 'P2SH-P2WSH',
    op_return: 'OP_RETURN',
    unknown: 'Unknown',
  };
  return map[t] ?? t;
};

export const scriptTypeClass = (t: string): string => {
  const map: Record<string, string> = {
    p2pkh: 'blue',
    p2sh: 'yellow',
    p2wpkh: 'green',
    p2wsh: 'green',
    p2tr: 'purple',
    p2tr_keypath: 'purple',
    p2tr_scriptpath: 'purple',
    'p2sh-p2wpkh': 'teal',
    'p2sh-p2wsh': 'teal',
    op_return: 'muted',
    unknown: 'red',
  };
  return map[t] ?? 'muted';
};

export const scriptTypeTooltip: Record<string, string> = {
  p2pkh:          'Classic Bitcoin address (starts with 1). Old-style, no efficiency discount.',
  p2sh:           'Script-based address (starts with 3). Used for multi-sig or complex rules.',
  p2wpkh:         'Modern SegWit address (starts with bc1q). Cheaper fees, widely supported.',
  p2wsh:          'Modern SegWit script address (starts with bc1q). For complex rules with lower fees.',
  p2tr:           'Taproot address (starts with bc1p). Newest, most private, cheapest.',
  p2tr_keypath:   'Taproot spent with a single key — most efficient path.',
  p2tr_scriptpath:'Taproot spent using an embedded script.',
  'p2sh-p2wpkh':  'SegWit wrapped in an older-style address for compatibility.',
  'p2sh-p2wsh':   'SegWit script wrapped in older-style address for compatibility.',
  op_return:      'Not a payment — embeds a small amount of arbitrary data in the blockchain.',
  unknown:        'Unrecognized script format — may be non-standard.',
};

export const WARNING_INFO: Record<string, { icon: string; title: string; plain: string; desc: string }> = {
  RBF_SIGNALING: {
    icon: '🔄',
    title: 'Can Be Replaced',
    plain: 'This payment can be swapped out for a higher-fee version before it confirms.',
    desc: 'Signals Replace-By-Fee (RBF, BIP125). Merchants should wait for confirmation before shipping.',
  },
  HIGH_FEE: {
    icon: '💸',
    title: 'High Fee Paid',
    plain: 'The sender paid a much higher fee than usual — possibly in a hurry to confirm quickly.',
    desc: 'Fee exceeds 1,000,000 sats or fee rate exceeds 200 sat/vB.',
  },
  DUST_OUTPUT: {
    icon: '🌫',
    title: 'Tiny Output',
    plain: 'One or more outputs are so small they might be worthless to spend in the future.',
    desc: 'Below the dust threshold (546 sats). Future spending cost may exceed the value.',
  },
  UNKNOWN_OUTPUT_SCRIPT: {
    icon: '❓',
    title: 'Unusual Script',
    plain: 'An output uses an unusual format that most wallets may not recognise.',
    desc: 'Non-standard scriptPubKey detected on at least one output.',
  },
};
