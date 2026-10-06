import React from 'react';

const TONES = {
  good: 'bg-signal-good/10 text-signal-good',
  warn: 'bg-signal-warn/10 text-signal-warn',
  bad: 'bg-signal-bad/10 text-signal-bad',
  info: 'bg-signal-info/10 text-signal-info',
  neutral: 'bg-ink-900/5 text-ink-700',
};

export default function Badge({ tone = 'neutral', children }) {
  return <span className={`badge ${TONES[tone] || TONES.neutral}`}>{children}</span>;
}

export function statusTone(status) {
  switch (status) {
    case 'Available': return 'good';
    case 'Reserved': return 'info';
    case 'Hold': return 'warn';
    case 'Damaged': return 'bad';
    case 'Dispatched': return 'neutral';
    default: return 'neutral';
  }
}

export function stockTone(level) {
  switch (level) {
    case 'ok': return 'good';
    case 'watch': return 'warn';
    case 'low': return 'warn';
    case 'out': return 'bad';
    default: return 'neutral';
  }
}
