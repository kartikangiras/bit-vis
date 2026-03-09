import { useState } from 'react';
import TxDashboard from './TxDashboard';
import { sats, truncate } from '../utils';

interface Props { data: any }

export default function BlockView({ data }: Props) {
  const blocks: any[] = data.blocks ?? [];

  return (
    <div className="dashboard">
      {blocks.map((block: any, bi: number) => (
        <BlockCard key={bi} block={block} index={bi} />
      ))}
    </div>
  );
}

function BlockCard({ block, index }: { block: any; index: number }) {
  const [selectedTx, setSelectedTx] = useState<any>(null);

  if (!block.ok) {
    return (
      <div className="error-card">
        <span className="error-icon">⚠</span>
        <div>
          <div className="error-title">Block {index}: {block.error?.code}</div>
          <div className="error-msg">{block.error?.message}</div>
        </div>
      </div>
    );
  }

  const bh = block.block_header;
  const bs = block.block_stats;
  const cb = block.coinbase;
  const txs: any[] = block.transactions ?? [];

  const totalFeesM = bs?.total_fees_sats 
    ? `${(bs.total_fees_sats / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 })}m sats` 
    : '0 sats';

  return (
    <div className="section-card">
      <div className="block-header-row">
        <div className="block-icon">🧱</div>
        <div>
          <div className="block-height">Block #{cb?.bip34_height ?? index}</div>
          <div className="block-hash mono">{bh?.block_hash ?? '—'}</div>
        </div>
      </div>

      <div className="story-card" style={{ marginBottom: 20 }}>
        <p>
          This block contains{' '}
          <strong className="hl-blue">{block.tx_count} transactions</strong>.
          The miner earned{' '}
          <strong className="hl-orange">{totalFeesM}</strong> in transaction fees
          at an average of{' '}
          <strong className="hl-orange">{bs?.avg_fee_rate_sat_vb ?? '?'} sat/vB</strong>.
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Height" value={String(cb?.bip34_height ?? '?')} sub="block height" />
        <StatCard label="Transactions" value={String(block.tx_count)} sub="total (incl. coinbase)" />
        <StatCard label="SegWit Txs" value={String(bs?.segwit_tx_count ?? '?')} sub={`of ${block.tx_count - 1} non-coinbase`} />
        <StatCard label="Total Fees" value={totalFeesM} sub="to miner" />
        <StatCard label="Avg Fee Rate" value={`${bs?.avg_fee_rate_sat_vb ?? '?'} sat/vB`} sub="non-coinbase txs" />
      </div>

      <div className="section-card-title">Transactions</div>
      <div className="block-tx-list">
        {txs.map((tx: any, ti: number) => {
          const isCoinbase = ti === 0;
          const isSelected = selectedTx?.txid === tx.txid;
          return (
            <div
              key={ti}
              className={`block-tx-row${isSelected ? ' selected' : ''}`}
              onClick={() => setSelectedTx(isSelected ? null : tx)}
            >
              <span className="block-tx-idx">{isCoinbase ? '🏆' : ti}</span>
              <span className="block-tx-id mono">{truncate(tx.txid, 18)}</span>
              <span className={`badge ${tx.segwit ? 'badge-green' : 'badge-muted'}`}>
                {tx.segwit ? 'SegWit' : 'Legacy'}
              </span>
              
              {!isCoinbase && tx.fee_sats > 0 && (
                <span className="block-tx-fee">
                  {sats(tx.fee_sats)}
                </span>
              )}
              
              <span className="block-tx-chevron">{isSelected ? '▼' : '▶'}</span>
            </div>
          );
        })}
      </div>

      {selectedTx && (
        <div className="block-tx-detail">
          <TxDashboard data={selectedTx} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="stat-card stat-card--blue">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}