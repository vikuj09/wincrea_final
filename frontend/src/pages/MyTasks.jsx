import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import useUserWorkspace from '../hooks/useUserWorkspace';
import { myDrafts } from '../utils/userWorkspace';
import { formatDate } from '../utils/dateUtils';

export default function MyTasks() {
  const { currentUser, proformaInvoices, loadProformaInvoices } = useApp();
  const { rows, save, error } = useUserWorkspace('tasks');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('Dispatch');
  const [due, setDue] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true); setLoadError('');
    try { await loadProformaInvoices(); }
    catch { setLoadError('Unable to refresh pending PIs. Try again.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [loadProformaInvoices]);
  const drafts = myDrafts(proformaInvoices, currentUser?.id);
  const tasks = rows.filter(row => row && typeof row.title === 'string');
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return <div className="space-y-5">
    <div className="flex items-center justify-between"><div><h1 className="font-display text-2xl">My Tasks</h1><p className="text-sm text-ink-700/60">Your pending PIs and personal work list.</p></div><button className="btn-secondary" disabled={loading} onClick={refresh}>{loading ? 'Refreshing…' : 'Refresh PIs'}</button></div>
    <section className="card p-5 space-y-3">
      <h2 className="font-display text-lg">My pending PIs ({drafts.length})</h2>
      <p className="text-sm text-ink-700/60">Drafts you created, oldest first. Confirming a PI records the dispatch.</p>
      {loadError && <p role="alert" className="text-red-600">{loadError}</p>}
      {!loading && !loadError && !drafts.length && <p>No pending PIs.</p>}
      {drafts.map(pi => <div key={pi.id} className="flex flex-wrap justify-between items-center gap-2 border-t py-3"><div><strong>{pi.piNumber}</strong> · {pi.customerName}<p className="text-xs text-ink-700/60">{formatDate(pi.createdAt)} · {pi.totalMeters} m</p></div><Link className="btn-secondary" to={`/suppliers?pi=${pi.id}`}>Review PI</Link></div>)}
    </section>
    <section className="card p-5 space-y-3">
      <h2 className="font-display text-lg">Personal tasks ({tasks.filter(t => !t.done).length} open)</h2>
      <p className="text-sm text-ink-700/60">Track dispatches, returns and follow-ups here. Completing a task only updates this checklist. Tasks are saved for your account in this browser.</p>
      <form className="flex flex-wrap gap-2" onSubmit={e => {
        e.preventDefault(); if (!title.trim()) return;
        if (save([...tasks, { id: crypto.randomUUID(), title: title.trim(), kind, due, done: false }])) { setTitle(''); setDue(''); }
      }}>
        <input className="input flex-1" aria-label="Task description" placeholder="What needs doing?" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} />
        <select className="input w-auto" aria-label="Task type" value={kind} onChange={e => setKind(e.target.value)}>{['Dispatch', 'Return', 'Follow-up'].map(k => <option key={k}>{k}</option>)}</select>
        <input className="input w-auto" aria-label="Task due date" type="date" value={due} onChange={e => setDue(e.target.value)} />
        <button className="btn-primary">Add task</button>
      </form>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} />Show completed</label>
      {tasks.filter(t => showCompleted || !t.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).map(task => <div key={task.id} className="flex flex-wrap items-center gap-3 border-t py-3">
        <input aria-label={`Complete ${task.title}`} type="checkbox" checked={task.done} onChange={() => save(tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t))} />
        <div className="flex-1"><p className={task.done ? 'line-through text-ink-700/50' : ''}>{task.title}</p><p className="text-xs text-ink-700/60">{task.kind}{task.due && ` · Due ${task.due}`}{!task.done && task.due && task.due < todayKey && <span className="text-red-600"> · Overdue</span>}</p></div>
        <Link className="btn-secondary" to={task.kind === 'Return' ? '/returns' : task.kind === 'Dispatch' ? '/outward' : '/customers'}>Open</Link>
        <button className="btn-secondary" onClick={() => save(tasks.filter(t => t.id !== task.id))}>Delete</button>
      </div>)}
      {!tasks.some(t => showCompleted || !t.done) && <p className="text-sm text-ink-700/60">No tasks to show. Add your next task above.</p>}
    </section>
  </div>;
}
