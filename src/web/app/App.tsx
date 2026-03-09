import { useState } from 'react';
import LoadPanel from './components/LoadPanel';
import TxDashboard from './components/TxDashboard';
import BlockView from './components/BlockView';

type Tab = 'tx' | 'block';

export default function App() {
  const [tab, setTab] = useState<Tab>('tx');
  const [txData, setTxData] = useState<any>(null);
  const [blockData, setBlockData] = useState<any>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);

  async function analyzeFixture(fixtureJson: string) {
    let fixture: any;
    try {
      fixture = JSON.parse(fixtureJson);
    } catch {
      setTxError('Invalid JSON — could not parse fixture.');
      return;
    }
    setTxError(null);
    setTxData(null);
    setTxLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fixture),
      });
      const data = await res.json();
      if (!data.ok) {
        setTxError(`${data.error?.code}: ${data.error?.message}`);
      } else {
        setTxData(data);
      }
    } catch (e: any) {
      setTxError('Network error: ' + e.message);
    } finally {
      setTxLoading(false);
    }
  }

  async function analyzeRaw(rawTx: string, prevoutsJson: string, network: string) {
    let prevouts: any[] = [];
    // Strip whitespace from hex (handles copy-paste with spaces/newlines)
    rawTx = rawTx.replace(/\s+/g, '');
    if (prevoutsJson.trim()) {
      try {
        prevouts = JSON.parse(prevoutsJson);
      } catch {
        setTxError('Invalid prevouts JSON.');
        return;
      }
    }
    setTxError(null);
    setTxData(null);
    setTxLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network, raw_tx: rawTx, prevouts }),
      });
      const data = await res.json();
      if (!data.ok) {
        setTxError(`${data.error?.code}: ${data.error?.message}`);
      } else {
        setTxData(data);
      }
    } catch (e: any) {
      setTxError('Network error: ' + e.message);
    } finally {
      setTxLoading(false);
    }
  }

  async function analyzeBlock(blkFile: File, revFile: File, xorFile: File) {
    setBlockError(null);
    setBlockData(null);
    setBlockLoading(true);
    try {
      const form = new FormData();
      form.append('blk', blkFile);
      form.append('rev', revFile);
      form.append('xor', xorFile);
      const res = await fetch('/api/analyze-block', { method: 'POST', body: form });
      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        setBlockError(
          `Server returned non-JSON response (HTTP ${res.status}). ` +
          `Is the server running? Details: ${raw.slice(0, 120)}`
        );
        return;
      }
      if (!data.ok) {
        setBlockError(`${data.error?.code}: ${data.error?.message}`);
      } else {
        setBlockData(data);
      }
    } catch (e: any) {
      setBlockError('Could not reach server — is it running? ' + e.message);
    } finally {
      setBlockLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <span className="logo-icon">₿</span>
          <div>
            <div className="logo-text">Chain<span>Lens</span></div>
            <div className="logo-sub">Bitcoin Transaction Visualizer</div>
          </div>
        </div>
        <nav className="header-tabs">
          <button className={`tab-btn${tab === 'tx' ? ' active' : ''}`} onClick={() => setTab('tx')}>
            Transaction
          </button>
          <button className={`tab-btn${tab === 'block' ? ' active' : ''}`} onClick={() => setTab('block')}>
            Block Explorer
          </button>
        </nav>
      </header>

      <main className="main">
        {tab === 'tx' && (
          <div className="tab-content">
            <LoadPanel
              mode="tx"
              loading={txLoading}
              onAnalyzeFixture={analyzeFixture}
              onAnalyzeRaw={analyzeRaw}
            />
            {txError && (
              <div className="error-card">
                <span className="error-icon">⚠</span>
                <div>
                  <div className="error-title">Analysis Failed</div>
                  <div className="error-msg">{txError}</div>
                </div>
              </div>
            )}
            {txData && <TxDashboard data={txData} />}
          </div>
        )}
        {tab === 'block' && (
          <div className="tab-content">
            <LoadPanel
              mode="block"
              loading={blockLoading}
              onAnalyzeBlock={analyzeBlock}
            />
            {blockError && (
              <div className="error-card">
                <span className="error-icon">⚠</span>
                <div>
                  <div className="error-title">Block Parse Failed</div>
                  <div className="error-msg">{blockError}</div>
                </div>
              </div>
            )}
            {blockData && <BlockView data={blockData} />}
          </div>
        )}
      </main>
    </div>
  );
}
