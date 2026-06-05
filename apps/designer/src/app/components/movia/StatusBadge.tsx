interface StatusBadgeProps {
  status: 'normal' | 'delay' | 'alert' | 'suspended';
  variant?: 'badge' | 'dot';
}

const statusConfig = {
  normal: {
    bg: 'var(--alert-normal-bg)',
    color: 'var(--alert-normal-text)',
    dotColor: '#1E8A3C',
    label: 'Operación normal',
  },
  delay: {
    bg: 'var(--alert-delay-bg)',
    color: 'var(--alert-delay-text)',
    dotColor: '#F59E0B',
    label: 'Retraso',
  },
  alert: {
    bg: 'var(--alert-danger-bg)',
    color: 'var(--alert-danger-text)',
    dotColor: '#DC2626',
    label: 'Alerta',
  },
  suspended: {
    bg: 'var(--alert-suspended-bg)',
    color: 'var(--alert-suspended-text)',
    dotColor: '#9CA3AF',
    label: 'Suspendido',
  },
};

export function StatusBadge({ status, variant = 'badge' }: StatusBadgeProps) {
  const config = statusConfig[status];

  if (variant === 'dot') {
    return (
      <div
        title={config.label}
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: config.dotColor,
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center"
      style={{
        padding: '3px 8px',
        borderRadius: '6px',
        backgroundColor: config.bg,
        color: config.color,
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        border: `1px solid ${config.dotColor}20`,
      }}
    >
      {config.label}
    </span>
  );
}
