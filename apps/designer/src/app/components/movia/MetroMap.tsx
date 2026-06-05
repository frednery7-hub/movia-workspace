import { useState, useRef } from 'react';
import { STATIONS, LINES, TRANSFERS } from '../../data/metroSantiago';

interface MetroMapProps {
  currentStationId?: string;
  destinationStationId?: string;
  onStationClick?: (stationId: string) => void;
}

const TRANSFER_SET = new Set<string>();
TRANSFERS.forEach(t => {
  const entry = Object.entries(STATIONS).find(([, v]) => v.name === t.station);
  if (entry) TRANSFER_SET.add(entry[0]);
});

function pts(ids: string[]): string {
  return ids
    .filter(id => id in STATIONS)
    .map(id => `${STATIONS[id].x},${STATIONS[id].y}`)
    .join(' ');
}

export function MetroMap({ currentStationId, destinationStationId, onStationClick }: MetroMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState('-5 -5 110 110');
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    drag.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    setPan({
      x: drag.current.px + (e.clientX - drag.current.sx) / scale,
      y: drag.current.py + (e.clientY - drag.current.sy) / scale,
    });
  };

  const handleMouseUp = () => { drag.current = null; };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: '#EDE9E3',
        overflow: 'hidden',
      }}
    >

      <svg
        width="100%"
        height="100%"
        viewBox="-5 -5 110 110"
        style={{ cursor: drag.current ? 'grabbing' : 'grab', display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Pan/zoom group */}
        <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`} style={{ transformOrigin: '50 50' }}>
          {/* Background grid */}
          <defs>
            <pattern id="mgrid" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
              <rect width="5" height="5" fill="#EDE9E3"/>
              <rect x="0.15" y="0.15" width="4.7" height="4.7" fill="#E8E4DC" rx="0.15"/>
              <line x1="0" y1="0" x2="5" y2="0" stroke="#D4CFC6" strokeWidth="0.12"/>
              <line x1="0" y1="0" x2="0" y2="5" stroke="#D4CFC6" strokeWidth="0.12"/>
            </pattern>
          </defs>
          <rect x="-10" y="-10" width="130" height="130" fill="url(#mgrid)"/>

          {/* Parks */}
          <ellipse cx="62" cy="58" rx="4" ry="2.5" fill="#B8D4A0" opacity="0.6"/>
          <rect x="78" y="34" width="6" height="4" rx="1" fill="#B8D4A0" opacity="0.5"/>
          <rect x="10" y="29" width="5" height="3" rx="1" fill="#B8D4A0" opacity="0.4"/>
          <ellipse cx="88" cy="72" rx="4" ry="2.5" fill="#A8C4D8" opacity="0.45"/>

          {/* Metro lines */}
          {[...LINES].reverse().map(line => (
            <polyline
              key={line.id}
              points={pts(line.stations)}
              stroke={line.color}
              strokeWidth={line.id === '1' ? 1.2 : 0.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.9}
            />
          ))}

          {/* Station markers */}
          {Object.entries(STATIONS).map(([id, st]) => {
            const isT = TRANSFER_SET.has(id);
            const isCur = id === currentStationId;
            const isDst = id === destinationStationId;
            const isHov = hovered === id;
            const color = LINES.find(l => l.stations.includes(id))?.color ?? '#888';
            const r = isCur || isDst ? 1.6 : isT ? 1.0 : 0.6;

            return (
              <g
                key={id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onStationClick?.(id)}
              >
                {/* Halo */}
                {isCur && <circle cx={st.x} cy={st.y} r={2.5} fill="rgba(26,115,232,0.18)"/>}
                {isDst && <circle cx={st.x} cy={st.y} r={2.2} fill="rgba(227,24,55,0.14)"/>}
                {/* Transfer outer ring */}
                {isT && !isCur && !isDst && (
                  <circle cx={st.x} cy={st.y} r={r + 0.45} fill="white" opacity={0.8}/>
                )}
                {/* Main dot */}
                <circle
                  cx={st.x} cy={st.y} r={r}
                  fill={isCur ? '#1A73E8' : isDst ? '#E31837' : 'white'}
                  stroke={isCur ? '#0D47A1' : isDst ? '#B71C1C' : color}
                  strokeWidth={isT ? 0.35 : 0.25}
                />
                {/* EFE badge */}
                {st.efeIntegration && (
                  <circle cx={st.x + r} cy={st.y - r} r={0.45} fill="#FFD100" stroke="white" strokeWidth={0.1}/>
                )}
                {/* Label on hover / current / dest */}
                {(isHov || isCur || isDst) && (
                  <g>
                    <rect
                      x={st.x - st.name.length * 0.58}
                      y={st.y - 3.6}
                      width={st.name.length * 1.16}
                      height={1.8}
                      rx={0.4}
                      fill="rgba(255,255,255,0.95)"
                    />
                    <text
                      x={st.x}
                      y={st.y - 2.15}
                      textAnchor="middle"
                      fontSize="1.3"
                      fontWeight={isCur || isDst ? '700' : '500'}
                      fill={isCur ? '#0D47A1' : isDst ? '#B71C1C' : '#111827'}
                      fontFamily="system-ui,-apple-system,sans-serif"
                      style={{ pointerEvents: 'none' }}
                    >
                      {st.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend — acima do card de ação */}
      <div style={{
        position: 'absolute', bottom: 100, left: 12, zIndex: 20,
        background: 'rgba(255,255,255,0.95)', borderRadius: 10,
        padding: '7px 11px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #E5E7EB',
      }}>
        {LINES.map(l => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <div style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: l.color, flexShrink: 0 }}/>
            <span style={{ fontSize: 10, color: '#374151', fontWeight: 500 }}>{l.name}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #E5E7EB', marginTop: 2, paddingTop: 3, display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #888', background: 'white', flexShrink: 0 }}/>
            <span style={{ fontSize: 9, color: '#6B7280' }}>Transf.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFD100', flexShrink: 0 }}/>
            <span style={{ fontSize: 9, color: '#6B7280' }}>EFE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
