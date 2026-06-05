interface LineChipProps {
  line: '1' | '2' | '3' | '4' | '4A' | '5' | '6';
  variant?: 'compact' | 'expanded';
}

const lineColors: Record<string, string> = {
  '1': 'var(--line-1)',
  '2': 'var(--line-2)',
  '3': 'var(--line-3)',
  '4': 'var(--line-4)',
  '4A': 'var(--line-4a)',
  '5': 'var(--line-5)',
  '6': 'var(--line-6)',
};

export function LineChip({ line, variant = 'compact' }: LineChipProps) {
  const backgroundColor = lineColors[line];

  if (variant === 'compact') {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          backgroundColor,
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        }}
      >
        <span
          className="text-white"
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
          }}
        >
          L{line}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center px-3"
      style={{
        height: '30px',
        borderRadius: '15px',
        backgroundColor,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
      }}
    >
      <span
        className="text-white"
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
        }}
      >
        L{line}
      </span>
    </div>
  );
}
