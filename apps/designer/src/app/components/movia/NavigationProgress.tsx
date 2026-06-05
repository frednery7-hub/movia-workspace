import { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { STATIONS, LINES } from '../../data/metroSantiago';

interface RouteStation {
  stationId: string;
  status: 'passed' | 'current' | 'future';
}

interface RouteSegment {
  lineId: string;
  stations: RouteStation[];
}

interface AlternativeRoute {
  label: string;
  duration: string;
  segments: RouteSegment[];
}

interface NavigationProgressProps {
  origin: string;
  destination: string;
  estimatedTime: string;
  arrivalTime: string;
  segments: RouteSegment[];
  alternatives?: AlternativeRoute[];
  onClose: () => void;
}

const lineColors: Record<string, string> = {
  '1': '#E31837', '2': '#F26522', '3': '#8B5E3C',
  '4': '#00A0DF', '4A': '#4DC3F7', '5': '#00A550', '6': '#9B59B6',
};

function LineCircle({ lineId, size = 28 }: { lineId: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: lineColors[lineId] ?? '#999',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ color: 'white', fontSize: size * 0.43, fontWeight: 700 }}>
        {lineId}
      </span>
    </div>
  );
}

function StationDot({ status, color }: { status: RouteStation['status']; color: string }) {
  if (status === 'current') {
    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: `${color}20`, position: 'absolute' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'white', border: `3px solid ${color}`, zIndex: 1 }} />
      </div>
    );
  }
  return (
    <div style={{
      width: 10, height: 10, borderRadius: '50%',
      backgroundColor: status === 'passed' ? color : 'white',
      border: `2.5px solid ${color}`,
    }} />
  );
}

function RouteSegmentView({ segment }: { segment: RouteSegment }) {
  const color = lineColors[segment.lineId] ?? '#999';
  const line = LINES.find(l => l.id === segment.lineId);

  return (
    <div className="flex gap-0">
      {/* Left: line number column */}
      <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
        <LineCircle lineId={segment.lineId} />
        <div style={{ width: 3, flex: 1, backgroundColor: color, marginTop: 4, borderRadius: 2 }} />
      </div>

      {/* Right: stations */}
      <div style={{ flex: 1, paddingBottom: 8 }}>
        {segment.stations.map((routeStation, i) => {
          const station = STATIONS[routeStation.stationId];
          if (!station) return null;

          const isFirst = i === 0;
          const isLast = i === segment.stations.length - 1;
          const isTransfer = station.isTransfer && station.lines.length > 1;

          return (
            <div key={routeStation.stationId}>
              {/* Station row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 4, minHeight: 40 }}>
                <StationDot status={routeStation.status} color={color} />
                <div>
                  <div style={{
                    fontSize: 16, fontWeight: routeStation.status === 'current' ? 700 : 500,
                    color: routeStation.status === 'passed' ? '#9CA3AF' : '#111827',
                    letterSpacing: -0.3,
                  }}>
                    {station.name} <span style={{ color, fontWeight: 700, fontSize: 14 }}>L{segment.lineId}</span>
                  </div>
                  {isFirst && (
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>Ingresa a la estación</div>
                  )}
                  {isLast && (
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>Sal de la estación</div>
                  )}
                </div>
              </div>

              {/* Vertical connector */}
              {!isLast && (
                <div style={{ display: 'flex', alignItems: 'stretch', paddingLeft: 4, height: 16 }}>
                  <div style={{ width: 10, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: 2, height: '100%', backgroundColor: color, opacity: 0.4 }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TransferBanner({ fromLine, toLine, toDirection }: {
  fromLine: string; toLine: string; toDirection: string;
}) {
  const toColor = lineColors[toLine] ?? '#999';
  return (
    <div style={{
      margin: '4px 0 4px 48px',
      padding: '10px 14px',
      borderRadius: 8,
      backgroundColor: '#F9FAFB',
      border: '1px solid #E5E7EB',
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
        Realizar Combinación
      </div>
      <div style={{ fontSize: 13, color: '#6B7280' }}>
        Combinación <span style={{ color: toColor, fontWeight: 600 }}>Línea {toLine}</span> dirección {toDirection}
      </div>
    </div>
  );
}

function AlternativeRouteCard({ route }: { route: AlternativeRoute }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      borderRadius: 10, overflow: 'hidden',
      border: '1px solid #E5E7EB',
      marginBottom: 8,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', backgroundColor: '#111827', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Ruta alternativa</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{route.duration}</span>
        </div>
        {open
          ? <ChevronUp size={18} color="rgba(255,255,255,0.7)" />
          : <ChevronDown size={18} color="rgba(255,255,255,0.7)" />
        }
      </button>

      {open && (
        <div style={{ padding: '12px 16px 8px', backgroundColor: '#FAFAFA' }}>
          {route.segments.map((seg, i) => (
            <div key={i}>
              {i > 0 && (
                <TransferBanner
                  fromLine={route.segments[i-1].lineId}
                  toLine={seg.lineId}
                  toDirection={
                    STATIONS[seg.stations[seg.stations.length - 1]?.stationId]?.name ?? ''
                  }
                />
              )}
              <RouteSegmentView segment={seg} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NavigationProgress({
  origin, destination, estimatedTime, arrivalTime,
  segments, alternatives = [], onClose,
}: NavigationProgressProps) {
  return (
    <div className="h-full flex flex-col" style={{ background: '#F7F5F2' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #232340 100%)',
        padding: '16px 20px', flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{origin}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>→</span>
            <span style={{ fontSize: 15, color: 'white', fontWeight: 700 }}>{destination}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
            <X size={22} />
          </button>
        </div>

        {/* Summary bar */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
          padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Tiempo estimado</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: -0.5 }}>
              {estimatedTime}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>N° de Estaciones</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: -0.5 }}>
              {segments.reduce((acc, s) => acc + s.stations.length, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable route */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* Main route */}
        <div style={{
          backgroundColor: 'white', borderRadius: 12,
          border: '1px solid #E5E7EB', padding: '12px 16px 8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
            Ruta Principal
          </div>
          {segments.map((seg, i) => (
            <div key={i}>
              {i > 0 && (
                <TransferBanner
                  fromLine={segments[i-1].lineId}
                  toLine={seg.lineId}
                  toDirection={
                    STATIONS[seg.stations[seg.stations.length - 1]?.stationId]?.name ?? ''
                  }
                />
              )}
              <RouteSegmentView segment={seg} />
            </div>
          ))}
        </div>

        {/* Alternative routes */}
        {alternatives.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
              Rutas Alternativas
            </div>
            {alternatives.map((alt, i) => (
              <AlternativeRouteCard key={i} route={alt} />
            ))}
          </div>
        )}

        {/* Share */}
        <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Dirección para compartir:</span>
          <div style={{ fontSize: 12, color: '#1A73E8', marginTop: 2 }}>
            {origin} → {destination} · Metro de Santiago
          </div>
        </div>
      </div>
    </div>
  );
}
