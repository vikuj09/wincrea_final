import React from 'react';

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'ink',
}) {

  const toneMap = {
    ink: {
      value: 'text-ink-900',
      iconBg: 'bg-ink-900/5',
      icon: 'text-ink-700',
    },

    good: {
      value: 'text-signal-good',
      iconBg: 'bg-signal-good/10',
      icon: 'text-signal-good',
    },

    warn: {
      value: 'text-signal-warn',
      iconBg: 'bg-signal-warn/10',
      icon: 'text-signal-warn',
    },

    bad: {
      value: 'text-signal-bad',
      iconBg: 'bg-signal-bad/10',
      icon: 'text-signal-bad',
    },

    loom: {
      value: 'text-loom-600',
      iconBg: 'bg-loom-50',
      icon: 'text-loom-600',
    },
  };


  const selectedTone =
    toneMap[tone] ||
    toneMap.ink;


  return (

    <div className="card p-4 flex items-start justify-between gap-4">

      {/* ====================================================
          CONTENT
      ==================================================== */}

      <div className="min-w-0">

        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/60">
          {label}
        </p>


        <p
          className={`font-display text-2xl mt-1 ${selectedTone.value}`}
        >
          {value}
        </p>


        {sub && (

          <p className="text-xs text-ink-700/60 mt-1">
            {sub}
          </p>

        )}

      </div>


      {/* ====================================================
          ICON
      ==================================================== */}

      {Icon && (

        <div
          className={`
            w-10
            h-10
            rounded-md
            flex
            items-center
            justify-center
            shrink-0
            ${selectedTone.iconBg}
          `}
        >

          <Icon
            size={19}
            className={selectedTone.icon}
          />

        </div>

      )}

    </div>

  );
}