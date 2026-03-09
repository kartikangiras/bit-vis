import { useState } from 'react';
import FlowDiagram from './FlowDiagram';
import { sats, btc, truncate, scriptTypeClass, scriptTypeLabel, scriptTypeFriendly, scriptTypeTooltip, WARNING_INFO } from '../utils';

interface Props { data: any }

export default function TxDashboard({ data: d }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  const isCoinbase = d.is_coinbase || d.fee_sats <= 0;

  const feePct = !isCoinbase && d.total_input_sats > 0
    ? ((d.fee_sats / d.total_input_sats) * 100).toFixed(2)
    : '0';

  return (
    <div className="dashboard">
      <div className="txid-header">
        <div className="txid-label">Transaction ID</div>
        <div className="txid-value">{d.txid}</div>
        <div className="txid-badges">
          <span className={`badge ${d.segwit ? 'badge-green' : 'badge-muted'}`}>
            {d.segwit ? '⚡ SegWit' : 'Legacy'}
          </span>
          {d.rbf_signaling && <span className="badge badge-yellow">🔄 RBF</span>}
          <span className="badge badge-muted">{d.network}</span>
          <span className="badge badge-muted">v{d.version}</span>
        </div>
      </div>

      {d.warnings?.length > 0 && (
        <div className="warnings-panel">
          <div className="warnings-heading">⚠ Things to know</div>
          {d.warnings.map((w: any) => {
            const info = WARNING_INFO[w.code] ?? { icon: '⚠', title: w.code, plain: w.code, desc: '' };
            return (
              <div className="warning-item" key={w.code}>
                <span className="warning-icon">{info.icon}</span>
                <div>
                  <span className="warning-title">{info.title}</span>
                  <span className="warning-plain"> — {info.plain}</span>
                  {info.desc && <div className="warning-tech muted">{info.desc}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="story-card">
        <div className="story-title">💡 What happened?</div>
        {isCoinbase ? (
          <p>
            This is a <strong className="hl-orange">coinbase transaction</strong> (or block reward claim) — it mints new
            bitcoin or collects fees. The miner receives{' '}
            <strong className="hl-green">{btc(d.total_output_sats)}</strong> ({sats(d.total_output_sats)}).
          </p>
        ) : (
          <>
            <p>
              This transaction moves{' '}
              <strong className="hl-orange">{btc(d.total_input_sats)}</strong>{' '}
              from{' '}
              <strong className="hl-blue">{d.vin_count} input{d.vin_count !== 1 ? 's' : ''}</strong>{' '}
              and creates{' '}
              <strong className="hl-green">{d.vout_count} output{d.vout_count !== 1 ? 's' : ''}</strong>.
            </p>
            <p>
              The miner receives a fee of{' '}
              <strong className="hl-orange">{sats(d.fee_sats)}</strong>{' '}
              at <strong className="hl-orange">{d.fee_rate_sat_vb} sat/vB</strong> — that's{' '}
              <strong>{feePct}%</strong> of the total input.{' '}
              {d.segwit
                ? 'SegWit is used, which puts signature data in a separate "witness" section, reducing the fee.'
                : 'This is a legacy transaction without SegWit optimization.'}
            </p>
          </>
        )}
        {d.locktime_type !== 'none' && (
          <p>
            The transaction has a <strong>{d.locktime_type}</strong> locktime set to{' '}
            <strong>{d.locktime_value}</strong>.
          </p>
        )}
      </div>

      <div className="stats-grid">
        <StatCard label="Fee" value={isCoinbase ? 'Block Reward' : sats(d.fee_sats)} sub={isCoinbase ? sats(d.total_output_sats) : `${d.fee_rate_sat_vb} sat/vB`} color="orange"
          tip={isCoinbase ? 'Coinbase: miner claims the block subsidy — no fee is paid.' : 'The amount paid to the miner to include this transaction in a block. Higher = faster confirm.'} />
        <StatCard label="Size" value={`${d.size_bytes} B`} sub="raw bytes" color="blue"
          tip="Total byte size of the serialized raw transaction." />
        <StatCard label="Virtual Size" value={`${d.vbytes} vB`} sub="fee is per vByte" color="teal"
          tip="SegWit transactions are measured in virtual bytes (vB). weight ÷ 4. Fee rate = fee ÷ vbytes." />
        <StatCard label="Weight" value={`${d.weight} WU`} sub="Witness Units" color="purple"
          tip="BIP141 weight: non-witness bytes × 4 + witness bytes × 1. Lower = cheaper block space." />
        <StatCard label="Inputs" value={`${d.vin_count}`}
          sub={[...new Set((d.vin ?? []).map((v: any) => scriptTypeFriendly(v.script_type)))].join(', ')}
          color="blue" tip="The sources of funds being spent in this transaction." />
        <StatCard label="Outputs" value={`${d.vout_count}`}
          sub={[...new Set((d.vout ?? []).map((v: any) => scriptTypeFriendly(v.script_type)))].join(', ')}
          color="green" tip="Where the funds are going, including any change back to the sender." />
        <StatCard label="Total In" value={btc(d.total_input_sats)} sub={sats(d.total_input_sats)} color="blue"
          tip="Sum of all input values (funds being spent)." />
        <StatCard label="Total Out" value={btc(d.total_output_sats)} sub={sats(d.total_output_sats)} color="green"
          tip="Sum of all output values. The difference from Total In is the miner fee." />
      </div>

      <div className="section-card">
        <div className="section-card-title">🔀 Value Flow</div>
        <FlowDiagram
          inputs={d.vin ?? []}
          outputs={d.vout ?? []}
          feeSats={d.fee_sats > 0 ? d.fee_sats : 0}
          totalInputSats={d.total_input_sats > 0 ? d.total_input_sats : d.total_output_sats}
        />
      </div>

      <div className="section-card">
        <div className="section-card-title">📥 Inputs <span className="count-badge">{d.vin_count}</span></div>
        {(d.vin ?? []).map((inp: any, i: number) => (
          <InputCard key={i} inp={inp} index={i} />
        ))}
      </div>

      <div className="section-card">
        <div className="section-card-title">📤 Outputs <span className="count-badge">{d.vout_count}</span></div>
        {(d.vout ?? []).map((out: any, i: number) => (
          <OutputCard key={i} out={out} index={i} />
        ))}
      </div>

      {d.segwit_savings && <SegwitSavings s={d.segwit_savings} />}

      <div className="section-card">
        <button className="collapse-toggle" onClick={() => setShowRaw(v => !v)}>
          <span>{showRaw ? '▼' : '▶'}</span> Technical / Raw Details
        </button>
        {showRaw && (
          <div className="raw-details">
            {[
              ['TXID', d.txid],
              ['wTXID', d.wtxid ?? '(legacy — same as TXID)'],
              ['Version', d.version],
              ['Locktime', `${d.locktime} (${d.locktime_type}${d.locktime_value ? ' = ' + d.locktime_value : ''})`],
              ['Network', d.network],
              ['SegWit', String(d.segwit)],
              ['RBF Signaling', String(d.rbf_signaling)],
              ['size_bytes', d.size_bytes],
              ['weight', `${d.weight} WU`],
              ['vbytes', d.vbytes],
              ['total_input_sats', d.total_input_sats],
              ['total_output_sats', d.total_output_sats],
              ['fee_sats', d.fee_sats],
              ['fee_rate_sat_vb', d.fee_rate_sat_vb],
            ].map(([k, v]) => (
              <div className="raw-row" key={String(k)}>
                <span className="raw-key">{k}</span>
                <span className="raw-val">{String(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, tip }: {
  label: string; value: string; sub: string; color: string; tip: string;
}) {
  return (
    <div className={`stat-card stat-card--${color}`} title={tip}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function InputCard({ inp, index }: { inp: any; index: number }) {
  const [open, setOpen] = useState(false);
  const [showTech, setShowTech] = useState(false);
  const color = scriptTypeClass(inp.script_type);
  const friendly = scriptTypeFriendly(inp.script_type);
  const techLabel = scriptTypeLabel(inp.script_type);
  const tooltip = scriptTypeTooltip[inp.script_type] ?? '';
  const rl = inp.relative_timelock;
  const rlStr = rl?.enabled
    ? `${rl.type === 'blocks' ? `${rl.value} blocks` : `~${Math.round(rl.value / 512)} minutes`} must pass before spending`
    : null;

  return (
    <div className={`io-card io-card--${color}${open ? ' open' : ''}`}>
      <div className="io-card-header" onClick={() => setOpen(v => !v)}>
        <span className="io-index">{index}</span>
        <div className="io-main">
          <div className="io-title">
            <span>{inp.address ? truncate(inp.address, 16) : `UTXO ${inp.txid.slice(0, 10)}…:${inp.vout}`}</span>
            <span className={`badge badge-${color}`} title={tooltip}>{friendly} <span className="badge-tech">({techLabel})</span></span>
          </div>
          <div className="io-sub mono">{inp.txid}:{inp.vout}</div>
        </div>
        <div className="io-value hl-blue">{btc(inp.prevout?.value_sats)}</div>
        <span className="chevron">{open ? '▼' : '▶'}</span>
      </div>

      {open && (
        <div className="io-body">
          {inp.address && <DetailRow k="Address" v={inp.address} mono />}
          <DetailRow k="Value" v={`${btc(inp.prevout?.value_sats)} (${sats(inp.prevout?.value_sats)})`} />
          <DetailRow k="Address type" v={
            <span className={`badge badge-${color}`} title={tooltip}>{friendly} — {tooltip}</span>
          } />
          {rlStr && <DetailRow k="Time-lock" v={rlStr} />}
          {inp.witness?.length > 0 && (
            <DetailRow k="Signatures" v={
              <span>{inp.witness.filter((w: string) => w !== '').length} signature(s) provided</span>
            } />
          )}

          <button className="tech-toggle" onClick={() => setShowTech(v => !v)}>
            {showTech ? '▼' : '▶'} Technical details
          </button>
          {showTech && (
            <div className="tech-section">
              <DetailRow k="Spending UTXO" v={`${inp.txid}:${inp.vout}`} mono />
              <DetailRow k="Sequence" v={`0x${inp.sequence?.toString(16).padStart(8, '0')}`} mono />
              <DetailRow k="Script type" v={techLabel} />
              {inp.script_sig_hex && <DetailRow k="ScriptSig (hex)" v={inp.script_sig_hex || '(empty)'} mono />}
              {inp.script_asm && <DetailRow k="ScriptSig (ASM)" v={inp.script_asm || '(empty)'} asm />}
              {inp.witness?.length > 0 && (
                <DetailRow k="Witness stack" v={
                  <div className="witness-stack">
                    {inp.witness.map((w: string, wi: number) => (
                      <div key={wi} className="witness-item">
                        <span className="witness-idx">#{wi}</span>
                        <span className={w === '' ? 'witness-empty' : ''}>{w || '(empty item)'}</span>
                      </div>
                    ))}
                  </div>
                } />
              )}
              {inp.witness_script_asm && <DetailRow k="Witness script (ASM)" v={inp.witness_script_asm} asm />}
              <DetailRow k="Prevout scriptPubKey" v={inp.prevout?.script_pubkey_hex} mono />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OutputCard({ out, index }: { out: any; index: number }) {
  const [open, setOpen] = useState(false);
  const [showTech, setShowTech] = useState(false);
  const color = scriptTypeClass(out.script_type);
  const friendly = scriptTypeFriendly(out.script_type);
  const techLabel = scriptTypeLabel(out.script_type);
  const tooltip = scriptTypeTooltip[out.script_type] ?? '';
  const isDust = out.script_type !== 'op_return' && out.value_sats < 546;
  const isOpReturn = out.script_type === 'op_return';

  return (
    <div className={`io-card io-card--${color}${open ? ' open' : ''}`}>
      <div className="io-card-header" onClick={() => setOpen(v => !v)}>
        <span className="io-index">{index}</span>
        <div className="io-main">
          <div className="io-title">
            <span>
              {isOpReturn ? 'Data Embed (OP_RETURN)' : out.address ? truncate(out.address, 18) : 'Unknown'}
            </span>
            <span className={`badge badge-${color}`} title={tooltip}>{friendly} <span className="badge-tech">({techLabel})</span></span>
            {isDust && <span className="badge badge-red" title="Too small to spend economically">DUST ⚠</span>}
          </div>
          {out.address && <div className="io-sub mono">{out.address}</div>}
        </div>
        <div className="io-value hl-green">{isOpReturn ? '0 BTC' : btc(out.value_sats)}</div>
        <span className="chevron">{open ? '▼' : '▶'}</span>
      </div>

      {open && (
        <div className="io-body">
          {!isOpReturn && <DetailRow k="Amount" v={`${btc(out.value_sats)} (${sats(out.value_sats)})`} />}
          {out.address && <DetailRow k="Recipient address" v={out.address} mono />}
          <DetailRow k="Address type" v={
            <span className={`badge badge-${color}`} title={tooltip}>{friendly} — {tooltip}</span>
          } />
          {isOpReturn && <>
            <DetailRow k="Embedded text" v={out.op_return_data_utf8 ?? '(not valid text)'} />
            <DetailRow k="Protocol" v={<span className="badge badge-purple">{out.op_return_protocol ?? 'unknown'}</span>} />
          </>}

          <button className="tech-toggle" onClick={() => setShowTech(v => !v)}>
            {showTech ? '▼' : '▶'} Technical details
          </button>
          {showTech && (
            <div className="tech-section">
              <DetailRow k="Output index" v={String(out.n)} />
              <DetailRow k="Script type" v={techLabel} />
              <DetailRow k="scriptPubKey (hex)" v={out.script_pubkey_hex} mono />
              <DetailRow k="scriptPubKey (ASM)" v={out.script_asm} asm />
              {isOpReturn && <DetailRow k="OP_RETURN data (hex)" v={out.op_return_data_hex || '(empty)'} mono />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ k, v, mono, asm }: {
  k: string; v: any; mono?: boolean; asm?: boolean;
}) {
  return (
    <div className="detail-row">
      <span className="detail-key">{k}</span>
      <span className={`detail-val${mono ? ' mono' : ''}${asm ? ' asm' : ''}`}>
        {typeof v === 'string' || typeof v === 'number' ? String(v) : v}
      </span>
    </div>
  );
}

function SegwitSavings({ s }: { s: any }) {
  const actualPct = Math.round((s.weight_actual / s.weight_if_legacy) * 100);
  return (
    <div className="section-card">
      <div className="section-card-title">
        ⚡ SegWit Savings
        <span className="badge badge-green" style={{ marginLeft: 10 }}>{s.savings_pct}% lighter</span>
      </div>
      <p className="section-desc">
        SegWit separates signature data into a separate "witness" section that gets a 75% weight discount.
        This makes SegWit transactions cheaper to include in a block.
      </p>
      <div className="savings-bars">
        <BarRow label="Actual (SegWit)" value={s.weight_actual} pct={actualPct} color="green" />
        <BarRow label="Would-be (Legacy)" value={s.weight_if_legacy} pct={100} color="red" />
      </div>
      <div className="savings-stats">
        <div><span className="muted">Witness bytes:</span> <strong>{s.witness_bytes}</strong></div>
        <div><span className="muted">Non-witness bytes:</span> <strong>{s.non_witness_bytes}</strong></div>
        <div><span className="muted">Total size:</span> <strong>{s.total_bytes} B</strong></div>
        <div><span className="muted">Legacy weight:</span> <strong>{s.weight_if_legacy} WU</strong></div>
        <div><span className="muted">Actual weight:</span> <strong>{s.weight_actual} WU</strong></div>
      </div>
    </div>
  );
}

function BarRow({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div className="bar-row">
      <div className="bar-row-label">
        <span>{label}</span>
        <span className="muted">{value} WU</span>
      </div>
      <div className="bar-track">
        <div className={`bar-fill bar-fill--${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}