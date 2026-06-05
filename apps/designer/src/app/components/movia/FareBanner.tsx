interface FareBannerProps {
  period: 'punta' | 'valle' | 'bajo';
  timeRange: string;
}

const fareConfig = {
  punta: {
    color: 'var(--fare-punta)',
    dotColor: '#F26522',
    label: 'Punta',
    icon: '●',
  },
  valle: {
    color: 'var(--fare-valle)',
    dotColor: '#4CAF50',
    label: 'Valle',
    icon: '●',
  },
  bajo: {
    color: 'var(--fare-bajo)',
    dotColor: '#2196F3',
    label: 'Bajo',
    icon: '●',
  },
};

export function FareBanner({ period, timeRange }: FareBannerProps) {
  const config = fareConfig[period];

  return (
    <div
      className="flex items-center gap-2.5 px-5"
      style={{
        height: '40px',
        background: `${config.color}0D`,
        borderLeft: `3px solid ${config.color}`,
        borderBottom: '1px solid #E5E7EB',
      }}
    >
      <span style={{ fontSize: '8px', color: config.dotColor, lineHeight: 1 }}>{config.icon}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>
        {config.label}
      </span>
      <span style={{ fontSize: '12px', color: '#6B7280' }}>{timeRange}</span>
    </div>
  );
}
