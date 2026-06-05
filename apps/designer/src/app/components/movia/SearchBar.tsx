import { Menu, Search } from 'lucide-react';

interface SearchBarProps {
  onMenuClick: () => void;
}

export function SearchBar({ onMenuClick }: SearchBarProps) {
  return (
    <div
      className="flex items-center gap-3 px-5 cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
      style={{
        height: '52px',
        borderRadius: '26px',
        background: 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '1px solid #E5E7EB',
      }}
      onClick={onMenuClick}
    >
      <button
        onClick={onMenuClick}
        className="flex items-center transition-transform duration-200 hover:scale-110"
      >
        <Menu size={20} style={{ color: '#6B7280', strokeWidth: 2 }} />
      </button>
      <span style={{
        fontSize: '15px',
        color: '#9CA3AF',
        flex: 1,
        fontWeight: 400,
        letterSpacing: '-0.01em'
      }}>
        ¿Para dónde?
      </span>
      <Search size={18} style={{ color: '#6B7280', strokeWidth: 2 }} />
    </div>
  );
}
