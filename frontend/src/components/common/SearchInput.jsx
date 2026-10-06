import React from 'react';
import { Search } from 'lucide-react';

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}) {
  return (
    <div
      className={`relative ${className}`}
      style={{ position: 'relative' }}
    >
      <Search
        size={18}
        strokeWidth={2}
        className="absolute text-ink-700/40 pointer-events-none"
        style={{
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input w-full"
        style={{
          paddingLeft: '48px',
        }}
      />
    </div>
  );
}