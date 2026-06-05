import { useState, useRef } from 'react';
import { MoviaSidebar } from './components/movia/MoviaSidebar';
import { SearchBar } from './components/movia/SearchBar';
import { NavigationProgress } from './components/movia/NavigationProgress';
import { MapOverlay } from './components/movia/MapOverlay';
import { Locate } from 'lucide-react';
import { MetroMap } from './components/movia/MetroMap';

// Station data for the metro map
const metroStations = {
  L1: [
    { x: 7, y: 48, name: 'San Pablo' },
    { x: 16, y: 48, name: 'Las Rejas' },
    { x: 25, y: 48, name: 'Santa Ana', transfer: true },
    { x: 34, y: 48, name: 'Baquedano', transfer: true },
    { x: 43, y: 47, name: 'Santa Lucía', current: true },
    { x: 52, y: 47, name: 'U. Católica' },
    { x: 61, y: 47, name: 'Tobalaba', transfer: true },
    { x: 72, y: 47, name: 'Los Leones' },
    { x: 82, y: 48, name: 'Manquehue' },
    { x: 92, y: 48, name: 'Escuela Militar' },
  ],
  L2: [
    { x: 25, y: 22, name: 'Cal y Canto' },
    { x: 25, y: 31, name: 'Puente Cal y Canto' },
    { x: 25, y: 48, name: 'Santa Ana', transfer: true },
    { x: 25, y: 57, name: 'Teatinos' },
    { x: 25, y: 66, name: 'Toesca' },
    { x: 26, y: 75, name: 'Parque O\'Higgins' },
  ],
  L5: [
    { x: 14, y: 64, name: 'Pudahuel' },
    { x: 24, y: 64, name: 'Quinta Normal' },
    { x: 34, y: 64, name: 'Baquedano', transfer: true },
    { x: 44, y: 64, name: 'Irarrázaval' },
    { x: 55, y: 64, name: 'Ñuñoa' },
    { x: 65, y: 64, name: 'Carlos Valdovinos' },
    { x: 76, y: 64, name: 'Vicuña Mackenna', transfer: true },
  ],
  L4: [
    { x: 61, y: 47, name: 'Tobalaba', transfer: true },
    { x: 66, y: 55, name: 'Cristóbal Colón' },
    { x: 70, y: 63, name: 'Francisco Bilbao' },
    { x: 76, y: 64, name: 'Vicuña Mackenna', transfer: true },
    { x: 80, y: 73, name: 'Macul' },
    { x: 82, y: 80, name: 'Grecia' },
  ],
};

const lineColorMap: Record<string, string> = {
  L1: '#E31837',
  L2: '#F26522',
  L5: '#00A550',
  L4: '#00A0DF',
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);
  const [irPressed, setIrPressed] = useState(false);
  const irRef = useRef<HTMLDivElement>(null);

  const segments = [
    {
      lineId: '1',
      stations: [
        { stationId: 'st_los_heroes',           status: 'passed'  as const },
        { stationId: 'st_universidad_de_chile', status: 'passed'  as const },
        { stationId: 'st_santa_lucia',          status: 'current' as const },
        { stationId: 'st_universidad_catolica', status: 'future'  as const },
        { stationId: 'st_baquedano',            status: 'future'  as const },
      ],
    },
    {
      lineId: '5',
      stations: [
        { stationId: 'st_baquedano',            status: 'future'  as const },
        { stationId: 'st_parque_bustamante',    status: 'future'  as const },
        { stationId: 'st_irarrazaval',          status: 'future'  as const },
        { stationId: 'st_nuble',                status: 'future'  as const },
      ],
    },
    {
      lineId: '6',
      stations: [
        { stationId: 'st_nuble',                status: 'future'  as const },
        { stationId: 'st_estadio_nacional',     status: 'future'  as const },
        { stationId: 'st_ines_de_suarez',       status: 'future'  as const },
        { stationId: 'st_los_leones',           status: 'future'  as const },
      ],
    },
  ];

  const alternatives = [
    {
      label: 'Ruta alternativa 1',
      duration: '22 min',
      segments: [
        {
          lineId: '1',
          stations: [
            { stationId: 'st_los_heroes',           status: 'future' as const },
            { stationId: 'st_universidad_de_chile', status: 'future' as const },
            { stationId: 'st_santa_lucia',          status: 'future' as const },
            { stationId: 'st_tobalaba',             status: 'future' as const },
          ],
        },
        {
          lineId: '4',
          stations: [
            { stationId: 'st_tobalaba',             status: 'future' as const },
            { stationId: 'st_cristobal_colon',      status: 'future' as const },
            { stationId: 'st_francisco_bilbao',     status: 'future' as const },
          ],
        },
      ],
    },
    {
      label: 'Ruta alternativa 2',
      duration: '28 min',
      segments: [
        {
          lineId: '1',
          stations: [
            { stationId: 'st_santa_lucia',          status: 'future' as const },
            { stationId: 'st_baquedano',            status: 'future' as const },
            { stationId: 'st_salvador',             status: 'future' as const },
            { stationId: 'st_los_leones',           status: 'future' as const },
          ],
        },
      ],
    },
  ];

  const handleIrPress = () => {
    setIrPressed(true);
    setTimeout(() => {
      setIrPressed(false);
      setNavigationActive(true);
    }, 300);
  };

  if (navigationActive) {
    return (
      <NavigationProgress
        origin="Los Heroes"
        destination="Los Leones"
        estimatedTime="18 min"
        arrivalTime="14:32"
        stations={stations}
        currentLine="1"
        onClose={() => setNavigationActive(false)}
      />
    );
  }

  // Build SVG polyline points from station arrays
  const buildPoints = (stations: { x: number; y: number }[]) =>
    stations.map(s => `${s.x}%,${s.y}%`).join(' ');

  return (
    <div className="size-full relative overflow-hidden">
      {/* MetroMap — todas as 7 linhas, 126 estações */}
      <div className="size-full" style={{ position: 'relative' }}>
        <MetroMap
          currentStationId="st_santa_lucia"
          destinationStationId="st_los_leones"
        />
        {/* Map overlay gradients */}
        <MapOverlay />
      </div>

      {/* Search Bar */}
      <div
        className="absolute top-0 left-0 right-0 px-4"
        style={{ marginTop: '52px' }}
      >
        <SearchBar onMenuClick={() => setSidebarOpen(true)} />
      </div>

      {/* Location Button */}
      <button
        className="absolute flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          position: 'absolute',
          right: '16px',
          bottom: '112px',
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.10)',
          border: '1px solid #E5E7EB',
        }}
      >
        <Locate size={19} style={{ color: '#1A73E8', strokeWidth: 2 }} />
      </button>

      {/* Quick Action Card */}
      <div
        className="absolute left-4 right-4"
        style={{
          bottom: '24px',
          borderRadius: '12px',
          background: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          border: '1px solid #E5E7EB',
          padding: '14px 16px',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-left">
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>
              Los Leones
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px', fontWeight: 400 }}>
              18 min · Línea 1
            </div>
          </div>
          <div
            ref={irRef}
            onClick={handleIrPress}
            className="cursor-pointer select-none"
            style={{
              background: 'var(--movia-accent-primary)',
              color: 'white',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              padding: '10px 24px',
              boxShadow: '0 2px 8px rgba(227, 24, 55, 0.3)',
              animation: irPressed ? 'irPress 300ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
              transform: irPressed ? 'scale(0.96)' : 'scale(1)',
              transition: irPressed ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            Ir
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <MoviaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <style>{`
        @keyframes locationHalo {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.2; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        }
        @keyframes irPress {
          0% { transform: scale(1); }
          30% { transform: scale(0.96); }
          70% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
