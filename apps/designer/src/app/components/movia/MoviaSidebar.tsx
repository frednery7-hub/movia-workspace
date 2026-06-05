import { X, MapPin, Settings } from 'lucide-react';
import { LineChip } from './LineChip';
import { StatusBadge } from './StatusBadge';
import { FareBanner } from './FareBanner';

interface MoviaSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const lines = [
  { number: '1' as const, name: 'Línea 1', status: 'normal' as const },
  { number: '2' as const, name: 'Línea 2', status: 'normal' as const },
  { number: '3' as const, name: 'Línea 3', status: 'delay' as const },
  { number: '4' as const, name: 'Línea 4', status: 'normal' as const },
  { number: '4A' as const, name: 'Línea 4A', status: 'normal' as const },
  { number: '5' as const, name: 'Línea 5', status: 'normal' as const },
  { number: '6' as const, name: 'Línea 6', status: 'normal' as const },
];

const alerts = [
  { type: 'normal' as const, title: 'Sistema operativo', text: 'Operación normal en todas las líneas del sistema.', time: 'hace 5 min' },
  { type: 'delay' as const, title: 'Línea 3 — velocidad reducida', text: 'Trenes circulando a velocidad reducida por trabajos de mantenimiento en tramo sur.', time: 'hace 15 min' },
  { type: 'alert' as const, title: 'Línea 1 — alta demanda', text: 'Posible retraso en horario punta por alta demanda de pasajeros.', time: 'hace 32 min' },
];

const languages = [
  { code: 'ES', flag: '🇨🇱', label: 'Español' },
  { code: 'PT', flag: '🇧🇷', label: 'Português' },
  { code: 'EN', flag: '🇺🇸', label: 'English' },
];

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      className="px-5 flex items-center gap-3"
      style={{ height: '36px', borderBottom: '1px solid #E5E7EB' }}
    >
      <span
        style={{
          fontSize: '11px',
          textTransform: 'uppercase' as const,
          color: '#9CA3AF',
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function MoviaSidebar({ isOpen, onClose }: MoviaSidebarProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
          style={{ animation: 'sidebarFadeIn 280ms ease-out' }}
        />
      )}

      {/* Sidebar */}
      <div
        className="fixed top-0 left-0 h-full z-50 overflow-y-auto"
        style={{
          width: '85%',
          maxWidth: '360px',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: isOpen
            ? 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)'
            : 'transform 250ms cubic-bezier(0.7, 0, 0.84, 0)',
          background: '#F7F5F2',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.10)',
        }}
      >
        {/* Header */}
        <div
          className="relative px-5 py-6"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #232340 100%)',
            height: '110px',
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <X size={22} strokeWidth={2} />
          </button>

          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center text-white"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <span style={{ fontSize: '17px', fontWeight: 600 }}>U</span>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', letterSpacing: '-0.02em' }}>
                Usuario anónimo
              </div>
              <div className="flex items-center gap-1.5 mt-0.5" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
                <MapPin size={11} strokeWidth={2} />
                <span>Santiago, CL</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#1E8A3C',
                    boxShadow: '0 0 6px #1E8A3C',
                    animation: 'statusPulse 3s ease-in-out infinite',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 400 }}>
                  Metro de Santiago
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fare Banner */}
        <FareBanner period="valle" timeRange="09:00 – 17:59" />

        {/* Lines Section */}
        <div className="mt-4" style={{ background: '#FFFFFF', borderRadius: '12px', margin: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <SectionHeader label="Líneas" />
          {lines.map((line) => {
            const isAbnormal = line.status !== 'normal';
            return (
              <div
                key={line.number}
                className="flex items-center gap-3 px-4 transition-all duration-150 hover:bg-gray-50 cursor-pointer active:bg-gray-100"
                style={{
                  height: '48px',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <LineChip line={line.number} />
                <span style={{ fontSize: '14px', flex: 1, fontWeight: 400, color: '#111827', letterSpacing: '-0.01em' }}>
                  {line.name}
                </span>
                {isAbnormal ? (
                  <StatusBadge status={line.status} variant="badge" />
                ) : (
                  <StatusBadge status={line.status} variant="dot" />
                )}
              </div>
            );
          })}
        </div>

        {/* Alerts Section */}
        <div style={{ background: '#FFFFFF', borderRadius: '12px', margin: '0 12px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <SectionHeader label="Ocurrencias" />

          {/* Filter pills */}
          <div className="px-4 py-2.5 flex gap-1.5 overflow-x-auto" style={{ borderBottom: '1px solid #F3F4F6' }}>
            {['Todas', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((filter, i) => (
              <button
                key={filter}
                className="transition-all duration-200"
                style={{
                  padding: '5px 11px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: i === 0 ? 600 : 400,
                  border: i === 0 ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: i === 0 ? 'var(--movia-accent-primary)' : 'transparent',
                  color: i === 0 ? 'white' : '#6B7280',
                  whiteSpace: 'nowrap' as const,
                  flexShrink: 0,
                }}
              >
                {filter}
              </button>
            ))}
          </div>

          {alerts.map((alert, i) => (
            <div
              key={i}
              className="px-4 py-3 transition-all duration-150 hover:bg-gray-50 cursor-pointer"
              style={{
                borderBottom: i < alerts.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={alert.type} variant={alert.type === 'normal' ? 'dot' : 'badge'} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>
                      {alert.title}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '13px',
                      lineHeight: '1.4',
                      color: '#6B7280',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const,
                      fontWeight: 400,
                    }}
                  >
                    {alert.text}
                  </p>
                </div>
                <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 400, flexShrink: 0, paddingTop: '2px' }}>
                  {alert.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Language Selector */}
        <div className="px-3 pb-3">
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >
            <SectionHeader label="Idioma" />
            <div className="flex gap-2 p-3">
              {languages.map((lang, i) => (
                <button
                  key={lang.code}
                  className="flex-1 transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    padding: '8px 0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: i === 0 ? 600 : 400,
                    backgroundColor: i === 0 ? 'var(--movia-accent-primary)' : '#F3F4F6',
                    color: i === 0 ? 'white' : '#6B7280',
                  }}
                >
                  {lang.flag} {lang.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="px-3 pb-6">
          <div
            className="flex items-center gap-3 px-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 active:bg-gray-100"
            style={{
              height: '52px',
              borderRadius: '12px',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <Settings size={18} style={{ color: '#6B7280', strokeWidth: 2 }} />
            <span style={{ fontSize: '14px', fontWeight: 400, color: '#111827', letterSpacing: '-0.01em' }}>
              Configuración
            </span>
          </div>
        </div>

        <style>{`
          @keyframes sidebarFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes statusPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.3); }
          }
        `}</style>
      </div>
    </>
  );
}
