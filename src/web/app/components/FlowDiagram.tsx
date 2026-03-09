import { btc, scriptTypeClass, scriptTypeFriendly, scriptTypeLabel } from '../utils';

interface Input {
  prevout?: { value_sats: number };
  script_type: string;
  address: string | null;
  txid: string;
  vout: number;
}

interface Output {
  value_sats: number;
  script_type: string;
  address: string | null;
  n: number;
}

interface Props {
  inputs: Input[];
  outputs: Output[];
  feeSats: number;
  totalInputSats: number;
}

export default function FlowDiagram({ inputs, outputs, feeSats, totalInputSats }: Props) {
  const validFee = feeSats >= 0;
  const feePct = validFee && totalInputSats > 0 ? ((feeSats / totalInputSats) * 100).toFixed(1) : '0';

  const maxItems = Math.max(inputs.length, outputs.length, 1);
  const rowH = 68;
  const minH = 120;
  const svgH = Math.max(minH, maxItems * rowH + 40);
  const svgW = 700;
  const leftX = 200;
  const rightX = svgW - 200;
  const centerX = svgW / 2;
  const boxW = 110;
  const boxH = 64;
  const boxY = svgH / 2 - boxH / 2;
  const nodeW = 170;
  const nodeH = 52;

  const inSpacing = inputs.length > 1 ? (svgH - 40) / inputs.length : 0;
  const outSpacing = outputs.length > 1 ? (svgH - 40) / outputs.length : 0;

  const inYs = inputs.map((_, i) =>
    inputs.length === 1 ? svgH / 2 : 20 + i * inSpacing + inSpacing / 2
  );
  const outYs = outputs.map((_, i) =>
    outputs.length === 1 ? svgH / 2 : 20 + i * outSpacing + outSpacing / 2
  );

  const colorMap: Record<string, string> = {
    blue: '#58a6ff', green: '#3fb950', purple: '#bc8cff',
    yellow: '#e3b341', teal: '#39d353', red: '#f85149', muted: '#8b949e',
  };

  function nodeColor(type: string) {
    return colorMap[scriptTypeClass(type)] ?? '#8b949e';
  }

  return (
    <div className="flow-diagram-wrap">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ width: '100%', height: 'auto', maxHeight: 400, display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#30363d" />
          </marker>
          <marker id="arrow-fee" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#f85149" />
          </marker>
          {inputs.map((inp, i) => (
            <marker key={`am-${i}`} id={`arrow-in-${i}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill={nodeColor(inp.script_type)} />
            </marker>
          ))}
          {outputs.map((out, i) => (
            <marker key={`aom-${i}`} id={`arrow-out-${i}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill={nodeColor(out.script_type)} />
            </marker>
          ))}
        </defs>

        <text x={leftX} y={14} textAnchor="middle" fill="#8b949e" fontSize="10" fontWeight="600" letterSpacing="1">
          MONEY IN
        </text>

        <text x={rightX} y={14} textAnchor="middle" fill="#8b949e" fontSize="10" fontWeight="600" letterSpacing="1">
          MONEY OUT
        </text>

        {inputs.map((inp, i) => {
          const cy = inYs[i];
          const color = nodeColor(inp.script_type);
          const friendlyLabel = scriptTypeFriendly(inp.script_type);
          const techLabel = scriptTypeLabel(inp.script_type);
          const label = inp.address
            ? inp.address.slice(0, 14) + '…'
            : inp.txid.slice(0, 10) + '…:' + inp.vout;
          return (
            <g key={i}>
              <line
                x1={leftX - nodeW / 2 + 6} y1={cy}
                x2={centerX - boxW / 2 - 8} y2={svgH / 2}
                stroke={color} strokeWidth="1.5" strokeOpacity="0.5"
                markerEnd={`url(#arrow-in-${i})`}
              />
              <rect
                x={leftX - nodeW / 2} y={cy - nodeH / 2}
                width={nodeW} height={nodeH} rx="8"
                fill="#161b22" stroke={color} strokeWidth="1.5"
              />
              <text x={leftX} y={cy - 12} textAnchor="middle" fill={color} fontSize="10" fontWeight="700">
                {friendlyLabel.toUpperCase()}
              </text>
              <text x={leftX} y={cy - 1} textAnchor="middle" fill="#8b949e" fontSize="8">
                ({techLabel})
              </text>
              <text x={leftX} y={cy + 12} textAnchor="middle" fill="#e6edf3" fontSize="12" fontWeight="600">
                {btc(inp.prevout?.value_sats)}
              </text>
              <text x={leftX} y={cy + 24} textAnchor="middle" fill="#8b949e" fontSize="9" fontFamily="monospace">
                {label}
              </text>
            </g>
          );
        })}

        {outputs.map((out, i) => {
          const cy = outYs[i];
          const color = nodeColor(out.script_type);
          const friendlyLabel = scriptTypeFriendly(out.script_type);
          const techLabel = scriptTypeLabel(out.script_type);
          const label = out.address ? out.address.slice(0, 14) + '…' : out.script_type === 'op_return' ? 'OP_RETURN' : 'unknown';
          return (
            <g key={i}>
              <line
                x1={centerX + boxW / 2 + 6} y1={svgH / 2}
                x2={rightX - nodeW / 2 - 8} y2={cy}
                stroke={color} strokeWidth="1.5" strokeOpacity="0.5"
                markerEnd={`url(#arrow-out-${i})`}
              />
              <rect
                x={rightX - nodeW / 2} y={cy - nodeH / 2}
                width={nodeW} height={nodeH} rx="8"
                fill="#161b22" stroke={color} strokeWidth="1.5"
              />
              <text x={rightX} y={cy - 12} textAnchor="middle" fill={color} fontSize="10" fontWeight="700">
                {friendlyLabel.toUpperCase()}
              </text>
              <text x={rightX} y={cy - 1} textAnchor="middle" fill="#8b949e" fontSize="8">
                ({techLabel})
              </text>
              <text x={rightX} y={cy + 12} textAnchor="middle" fill="#e6edf3" fontSize="12" fontWeight="600">
                {btc(out.value_sats)}
              </text>
              <text x={rightX} y={cy + 24} textAnchor="middle" fill="#8b949e" fontSize="9" fontFamily="monospace">
                {label}
              </text>
            </g>
          );
        })}

        <rect
          x={centerX - boxW / 2} y={boxY}
          width={boxW} height={boxH} rx="10"
          fill="#1c2128" stroke="#f7931a" strokeWidth="2"
        />
        <text x={centerX} y={boxY + 18} textAnchor="middle" fill="#f7931a" fontSize="12" fontWeight="800">
          TRANSACTION
        </text>
        <text x={centerX} y={boxY + 34} textAnchor="middle" fill="#e6edf3" fontSize="11" fontWeight="600">
          ⛏ Fee
        </text>
        <text x={centerX} y={boxY + 50} textAnchor="middle" fill="#f85149" fontSize="10">
          {validFee ? `${feeSats.toLocaleString()} sats (${feePct}%)` : '—'}
        </text>
      </svg>

      <div className="flow-legend">
        <span className="legend-item" title="Classic Bitcoin — P2PKH"><span className="legend-dot" style={{ background: '#58a6ff' }} />Classic Bitcoin</span>
        <span className="legend-item" title="Modern Bitcoin — P2WPKH / P2WSH"><span className="legend-dot" style={{ background: '#3fb950' }} />Modern Bitcoin</span>
        <span className="legend-item" title="Taproot — newest & most private"><span className="legend-dot" style={{ background: '#bc8cff' }} />Taproot</span>
        <span className="legend-item" title="Script Address — P2SH"><span className="legend-dot" style={{ background: '#e3b341' }} />Script Address</span>
        <span className="legend-item" title="Miner fee — not sent to anyone"><span className="legend-dot" style={{ background: '#f85149' }} />Miner Fee</span>
      </div>
    </div>
  );
}
