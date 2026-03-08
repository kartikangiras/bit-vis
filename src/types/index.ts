export interface Fixture {
  network: string;
  raw_tx: string;
  prevouts: PrevoutData[];
}

export interface PrevoutData {
  txid: string;
  vout: number;
  value_sats: number;
  script_pubkey_hex: string;
}

export interface ParsedInput {
  txid: string;
  vout: number;
  sequence: number;
  script_sig_hex: string;
  script_asm: string;
  witness: string[];
  script_type: string;
  address: string | null;
  prevout: {
    value_sats: number;
    script_pubkey_hex: string;
  };
  relative_timelock: {
    enabled: boolean;
    type?: string;
    value?: number;
  };
  witness_script_asm?: string;
}

export interface ParsedOutput {
  n: number;
  value_sats: number;
  script_pubkey_hex: string;
  script_asm: string;
  script_type: string;
  address: string | null;
  op_return_data_hex?: string;
  op_return_data_utf8?: string | null;
  op_return_protocol?: string;
}

export interface SegwitSavings {
  witness_bytes: number;
  non_witness_bytes: number;
  total_bytes: number;
  weight_actual: number;
  weight_if_legacy: number;
  savings_pct: number;
}

export interface Warning {
  code: string;
}

export interface TransactionAnalysis {
  ok: boolean;
  is_coinbase: boolean;
  network: string;
  segwit: boolean;
  txid: string;
  wtxid: string | null;
  version: number;
  locktime: number;
  size_bytes: number;
  weight: number;
  vbytes: number;
  total_input_sats: number;
  total_output_sats: number;
  fee_sats: number;
  fee_rate_sat_vb: number;
  rbf_signaling: boolean;
  locktime_type: string;
  locktime_value?: number;
  segwit_savings: SegwitSavings | null;
  vin_count: number;
  vout_count: number;
  vin?: ParsedInput[];
  vout: ParsedOutput[];
  warnings: Warning[];
}

export interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export interface BlockHeader {
  version: number;
  prev_block_hash: string;
  merkle_root: string;
  merkle_root_valid: boolean;
  timestamp: number;
  bits: string;
  nonce: number;
  block_hash: string;
}

export interface CoinbaseInfo {
  bip34_height: number;
  coinbase_script_hex: string;
  total_output_sats: number;
}

export interface BlockStats {
  total_fees_sats: number;
  total_weight: number;
  avg_fee_rate_sat_vb: number;
  script_type_summary: { [key: string]: number };
  segwit_tx_count: number;
}

export interface BlockError {
  ok: false;
  block_hash: string;
  error: { code: string; message: string };
}

export interface BlockAnalysis {
  ok: true;
  mode: string;
  block_header: BlockHeader;
  tx_count: number;
  coinbase: CoinbaseInfo;
  block_stats: BlockStats;
  transactions: TransactionAnalysis[];
}