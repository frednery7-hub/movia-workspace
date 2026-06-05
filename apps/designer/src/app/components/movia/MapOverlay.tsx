export function MapOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top gradient - warm */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: '160px',
          background: 'linear-gradient(180deg, rgba(247, 245, 242, 0.5) 0%, transparent 100%)',
        }}
      />
      {/* Bottom gradient - warm */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '220px',
          background: 'linear-gradient(0deg, rgba(247, 245, 242, 0.65) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
