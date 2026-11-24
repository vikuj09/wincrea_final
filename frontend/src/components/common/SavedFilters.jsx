import React, { useState } from 'react';
import useUserWorkspace from '../../hooks/useUserWorkspace';

export default function SavedFilters({ page, values, onApply }) {
  const { rows, save, error } = useUserWorkspace(`filters:${page}`);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  const presets = rows.filter(row => row && typeof row.name === 'string' && row.values && typeof row.values === 'object');
  return <div className="rounded-xl border border-ink-900/10 bg-white p-3 space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">Saved filters</span>
      <select aria-label="Saved filter" className="input w-auto" value={selected} onChange={e => setSelected(e.target.value)}>
        <option value="">Choose a saved filter</option>
        {presets.map(row => <option key={row.name} value={row.name}>{row.name}</option>)}
      </select>
      <button type="button" className="btn-secondary" disabled={!presets.some(row => row.name === selected)} onClick={() => {
        const preset = presets.find(row => row.name === selected);
        if (preset) onApply(preset.values);
      }}>Apply</button>
      <button type="button" className="btn-secondary" disabled={!selected} onClick={() => {
        if (save(presets.filter(row => row.name !== selected))) setSelected('');
      }}>Delete</button>
      <input aria-label="Filter name" className="input w-auto" maxLength={60} placeholder="Name these filters" value={name} onChange={e => setName(e.target.value)} />
      <button type="button" className="btn-secondary" disabled={!name.trim()} onClick={() => {
        const title = name.trim();
        if (save([...presets.filter(row => row.name !== title), { name: title, values }])) { setSelected(title); setName(''); }
      }}>{presets.some(row => row.name === name.trim()) ? 'Update saved filter' : 'Save current filters'}</button>
    </div>
    <p className="text-xs text-ink-700/60">Saved for your account in this browser.</p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}
