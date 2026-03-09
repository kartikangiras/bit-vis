import { useState, useRef } from 'react';

interface Props {
  mode: 'tx' | 'block';
  loading: boolean;
  onAnalyzeFixture?: (json: string) => void;
  onAnalyzeRaw?: (rawTx: string, prevouts: string, network: string) => void;
  onAnalyzeBlock?: (blk: File, rev: File, xor: File) => void;
}

export default function LoadPanel({ mode, loading, onAnalyzeFixture, onAnalyzeRaw, onAnalyzeBlock }: Props) {
  const [inputMode, setInputMode] = useState<'fixture' | 'raw'>('fixture');
  const [fixtureText, setFixtureText] = useState('');
  const [rawTx, setRawTx] = useState('');
  const [prevoutsText, setPrevoutsText] = useState('');
  const [network, setNetwork] = useState('mainnet');

  const [blkFile, setBlkFile] = useState<File | null>(null);
  const [revFile, setRevFile] = useState<File | null>(null);
  const [xorFile, setXorFile] = useState<File | null>(null);

  const blkRef = useRef<HTMLInputElement>(null);
  const revRef = useRef<HTMLInputElement>(null);
  const xorRef = useRef<HTMLInputElement>(null);

  async function loadExample() {
    const paths = [
      '/fixtures/transactions/tx_segwit_p2wpkh_p2tr.json',
      '/fixtures/transactions/tx_legacy_p2pkh.json',
    ];
    for (const p of paths) {
      try {
        const r = await fetch(p);
        if (r.ok) { setFixtureText(await r.text()); return; }
      } catch {}
    }
  }

  if (mode === 'block') {
    return (
      <div className="load-panel">
        <div className="load-panel-title">
          <span>🧱</span> Upload Block Files
        </div>
        <p className="load-panel-desc">
          Upload Bitcoin Core block files (blk*.dat, rev*.dat, xor.dat) to analyze the block.
        </p>
        <div className="file-upload-grid">
          {([
            { label: 'blk*.dat', state: blkFile, ref: blkRef, set: setBlkFile },
            { label: 'rev*.dat', state: revFile, ref: revRef, set: setRevFile },
            { label: 'xor.dat',  state: xorFile, ref: xorRef, set: setXorFile },
          ] as const).map(({ label, state, ref, set }) => (
            <div key={label} className="drop-zone" onClick={() => ref.current?.click()}>
              <input ref={ref as any} type="file" accept=".dat" style={{ display: 'none' }}
                onChange={e => set(e.target.files?.[0] ?? null)} />
              {state ? (
                <><div className="drop-zone-icon">✅</div><div className="drop-zone-name">{state.name}</div></>
              ) : (
                <><div className="drop-zone-icon">📂</div><div className="drop-zone-label">{label}</div><div className="drop-zone-hint">Click or drag & drop</div></>
              )}
            </div>
          ))}
        </div>
        <button
          className="btn btn-primary"
          disabled={!blkFile || !revFile || !xorFile || loading}
          onClick={() => blkFile && revFile && xorFile && onAnalyzeBlock?.(blkFile, revFile, xorFile)}
        >
          {loading ? <><span className="spinner" /> Parsing block…</> : '🧱 Analyze Block'}
        </button>
      </div>
    );
  }

  return (
    <div className="load-panel">
      <div className="load-panel-title">
        <span>📋</span> Load Transaction
      </div>

      <div className="mode-toggle">
        <button className={`mode-btn${inputMode === 'fixture' ? ' active' : ''}`}
          onClick={() => setInputMode('fixture')}>Fixture JSON</button>
        <button className={`mode-btn${inputMode === 'raw' ? ' active' : ''}`}
          onClick={() => setInputMode('raw')}>Raw Hex</button>
      </div>

      {inputMode === 'fixture' && (
        <>
          <div className="field">
            <label className="field-label">Fixture JSON</label>
            <textarea
              className="field-input"
              rows={6}
              placeholder={'{\n  "network": "mainnet",\n  "raw_tx": "0200000001...",\n  "prevouts": [...]\n}'}
              value={fixtureText}
              onChange={e => setFixtureText(e.target.value)}
            />
          </div>
          <div className="load-actions">
            <button className="btn btn-primary" disabled={!fixtureText.trim() || loading}
              onClick={() => onAnalyzeFixture?.(fixtureText)}>
              {loading ? <><span className="spinner" /> Analyzing…</> : '🔍 Analyze'}
            </button>
            <button className="btn btn-ghost" onClick={loadExample}>Load Example</button>
          </div>
        </>
      )}

      {inputMode === 'raw' && (
        <>
          <div className="field">
            <label className="field-label">Raw Transaction Hex</label>
            <textarea className="field-input" rows={4} placeholder="020000000001..."
              value={rawTx} onChange={e => setRawTx(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Prevouts JSON array</label>
            <textarea className="field-input" rows={4}
              placeholder='[{"txid":"...","vout":0,"value_sats":100000,"script_pubkey_hex":"..."}]'
              value={prevoutsText} onChange={e => setPrevoutsText(e.target.value)} />
          </div>
          <div className="field field-row">
            <div>
              <label className="field-label">Network</label>
              <select className="field-select" value={network} onChange={e => setNetwork(e.target.value)}>
                <option value="mainnet">mainnet</option>
                <option value="testnet">testnet</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" disabled={!rawTx.trim() || loading}
            onClick={() => onAnalyzeRaw?.(rawTx, prevoutsText, network)}>
            {loading ? <><span className="spinner" /> Analyzing…</> : '🔍 Analyze'}
          </button>
        </>
      )}
    </div>
  );
}
