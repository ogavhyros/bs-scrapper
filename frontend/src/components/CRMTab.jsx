import { useState, useMemo, useCallback } from 'react';
import { Phone, Globe, MapPin, Star, Trash2, Search } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS   = ['Not Called', 'Called', 'Follow Up', 'Converted', 'Interested', 'Not Interested'];
const PRIORITY_OPTIONS = ['Cold', 'Warm', 'Hot'];
const OUTCOME_OPTIONS  = ['Interested', 'Not Interested', 'No Answer', 'Voicemail', 'Wrong Number'];
const ACTION_OPTIONS   = ['Send Proposal', 'Call Again', 'Remove', 'Converted'];

const STATUS_COLORS = {
  'Not Called':     { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  'Called':         { bg: '#f0fdf4', text: '#22c55e', border: '#bbf7d0' },
  'Follow Up':      { bg: '#fffbeb', text: '#f59e0b', border: '#fde68a' },
  'Converted':      { bg: '#f5f3ff', text: '#8b5cf6', border: '#ddd6fe' },
  'Interested':     { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' },
  'Not Interested': { bg: '#fef2f2', text: '#ef4444', border: '#fecaca' },
};

const PRIORITY_META = {
  Hot:  { text: '#ef4444', icon: '🔥' },
  Warm: { text: '#f59e0b', icon: '♨'  },
  Cold: { text: '#3b82f6', icon: '❄'  },
};

const PRIORITY_ORDER = { Hot: 3, Warm: 2, Cold: 1 };

const AVATAR_COLORS = [
  '#3b82f6','#8b5cf6','#f59e0b','#10b981',
  '#ef4444','#6366f1','#0ea5e9','#ec4899',
];

const STAT_CARDS = [
  { key: 'total',     label: 'Total',      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'notCalled', label: 'Not Called', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
  { key: 'called',    label: 'Called',     color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'followUp',  label: 'Follow Up',  color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { key: 'converted', label: 'Converted',  color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
];

// compact input style (avoids w-full + custom padding conflict)
const ci = 'bg-surface border border-line rounded-nav px-3 py-1.5 text-[13px] text-ink w-full ' +
           'placeholder-ink-ghost focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20';

function getInitials(name = '') {
  return name.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';
}

// ── CRM Card ──────────────────────────────────────────────────────────────────

function CRMCard({ c, savedKey, onChange, onSave, onBlurSave, onRemove }) {
  const statusCfg = STATUS_COLORS[c.status] ?? STATUS_COLORS['Not Called'];
  const priMeta   = PRIORITY_META[c.priority] ?? PRIORITY_META.Cold;
  const avatarBg  = AVATAR_COLORS[Math.abs((c.id ?? 0) + (c.name?.charCodeAt(0) ?? 0)) % AVATAR_COLORS.length];

  const saved = (field) => savedKey === `${c.place_id}-${field}`;
  const lbl   = (text, field) => (
    <label className="label-xs block mb-1">
      {text}{saved(field) && <span className="text-brand normal-case font-normal ml-1.5">✓ saved</span>}
    </label>
  );

  return (
    <div className="card p-5 hover:shadow-card-lg transition-shadow duration-150">
      <div className="flex gap-5">

        {/* ── Left: Business info ──────────────────────────────────────── */}
        <div className="flex gap-3.5 flex-1 min-w-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white
                       font-bold text-[13px] flex-shrink-0 mt-0.5"
            style={{ backgroundColor: avatarBg }}
          >
            {getInitials(c.name)}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-bold text-ink leading-tight mb-1.5">
              {c.name || '—'}
            </h3>

            {/* Status + priority row */}
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <span
                className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold border"
                style={{ backgroundColor: statusCfg.bg, color: statusCfg.text, borderColor: statusCfg.border }}
              >
                ● {c.status || 'Not Called'}
              </span>
              <span className="text-[13px] font-medium" style={{ color: priMeta.text }}>
                {priMeta.icon} {c.priority || 'Cold'}
              </span>
              {c.outcome && (
                <span className="px-2 py-0.5 bg-nav-active text-ink-soft text-[11px] rounded-full border border-line">
                  {c.outcome}
                </span>
              )}
            </div>

            {/* Contact details */}
            <div className="space-y-1">
              {c.phone ? (
                <div className="flex items-center gap-1.5 text-sm">
                  <Phone size={12} className="text-ink-muted flex-shrink-0" />
                  <a href={`tel:${c.phone}`} className="text-brand hover:underline font-medium">
                    {c.phone}
                  </a>
                </div>
              ) : null}
              {c.website ? (
                <div className="flex items-center gap-1.5 text-sm min-w-0">
                  <Globe size={12} className="text-ink-muted flex-shrink-0" />
                  <a
                    href={c.website} target="_blank" rel="noopener noreferrer"
                    className="text-ink-soft hover:text-brand transition-colors truncate"
                  >
                    {c.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  </a>
                </div>
              ) : null}
              {c.address ? (
                <div className="flex items-start gap-1.5 text-xs text-ink-muted">
                  <MapPin size={11} className="flex-shrink-0 mt-0.5" />
                  <span>{c.address}</span>
                </div>
              ) : null}
              {c.rating != null && c.rating !== '' ? (
                <div className="flex items-center gap-1 text-xs text-ink-muted">
                  <Star size={11} className="text-amber-400 fill-amber-400" />
                  <span>{c.rating}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-line flex-shrink-0 self-stretch" />

        {/* ── Right: Inline edit fields ─────────────────────────────────── */}
        <div className="w-[350px] flex-shrink-0 space-y-2.5">

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              {lbl('Status', 'status')}
              <select
                value={c.status || 'Not Called'}
                onChange={e => { onChange('status', e.target.value); onSave('status', e.target.value); }}
                className={ci}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              {lbl('Priority', 'priority')}
              <select
                value={c.priority || 'Cold'}
                onChange={e => { onChange('priority', e.target.value); onSave('priority', e.target.value); }}
                className={ci}
              >
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Call Date + Contact Person */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              {lbl('Call Date', 'call_date')}
              <input
                type="date"
                value={c.call_date || ''}
                onChange={e => { onChange('call_date', e.target.value); onSave('call_date', e.target.value); }}
                className={ci}
              />
            </div>
            <div>
              {lbl('Contact Person', 'contact_person')}
              <input
                type="text"
                value={c.contact_person || ''}
                placeholder="Name"
                onChange={e => onChange('contact_person', e.target.value)}
                onBlur={e => onBlurSave('contact_person', e.target.value)}
                className={ci}
              />
            </div>
          </div>

          {/* Outcome + Next Action */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              {lbl('Outcome', 'outcome')}
              <select
                value={c.outcome || ''}
                onChange={e => { onChange('outcome', e.target.value); onSave('outcome', e.target.value); }}
                className={ci}
              >
                <option value="">—</option>
                {OUTCOME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              {lbl('Next Action', 'next_action')}
              <select
                value={c.next_action || ''}
                onChange={e => { onChange('next_action', e.target.value); onSave('next_action', e.target.value); }}
                className={ci}
              >
                <option value="">—</option>
                {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            {lbl('Notes', 'notes')}
            <textarea
              value={c.notes || ''}
              placeholder="Call notes…"
              rows={2}
              onChange={e => onChange('notes', e.target.value)}
              onBlur={e => onBlurSave('notes', e.target.value)}
              className={`${ci} resize-none`}
            />
          </div>

          {/* Remove */}
          <div className="flex justify-end pt-0.5">
            <button
              onClick={() => onRemove(c.place_id)}
              className="flex items-center gap-1.5 text-[12px] text-red-400 hover:text-red-600
                         hover:bg-red-50 px-2.5 py-1.5 rounded-nav transition-colors"
            >
              <Trash2 size={12} />
              Remove from CRM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CRMTab ────────────────────────────────────────────────────────────────────

export default function CRMTab({ crmContacts, onRefresh, showToast }) {
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy,         setSortBy]         = useState('date');
  const [localEdits,     setLocalEdits]     = useState({});
  const [savedKey,       setSavedKey]       = useState(null);

  // Merge backend data with local (optimistic) edits
  const merged = useMemo(() =>
    crmContacts.map(c => ({ ...c, ...(localEdits[c.place_id] ?? {}) })),
    [crmContacts, localEdits],
  );

  // Stats from merged data so they update on local status changes
  const stats = useMemo(() => {
    const s = { total: merged.length, notCalled: 0, called: 0, followUp: 0, converted: 0 };
    for (const c of merged) {
      const st = c.status || 'Not Called';
      if (st === 'Not Called')  s.notCalled++;
      else if (st === 'Called') s.called++;
      else if (st === 'Follow Up') s.followUp++;
      else if (st === 'Converted') s.converted++;
    }
    return s;
  }, [merged]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = merged;
    if (statusFilter !== 'All')   list = list.filter(c => (c.status   || 'Not Called') === statusFilter);
    if (priorityFilter !== 'All') list = list.filter(c => (c.priority || 'Cold')       === priorityFilter);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter(c =>
      (c.name    || '').toLowerCase().includes(q) ||
      (c.phone   || '').includes(q)               ||
      (c.address || '').toLowerCase().includes(q) ||
      (c.notes   || '').toLowerCase().includes(q)
    );
    const out = [...list];
    if (sortBy === 'name')     out.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sortBy === 'priority') out.sort((a, b) => (PRIORITY_ORDER[b.priority] ?? 1) - (PRIORITY_ORDER[a.priority] ?? 1));
    if (sortBy === 'updated')  out.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    return out;
  }, [merged, search, statusFilter, priorityFilter, sortBy]);

  const applyEdit = useCallback((place_id, field, value) => {
    setLocalEdits(prev => ({
      ...prev,
      [place_id]: { ...(prev[place_id] ?? {}), [field]: value },
    }));
  }, []);

  const flashSaved = useCallback((place_id, field) => {
    const key = `${place_id}-${field}`;
    setSavedKey(key);
    setTimeout(() => setSavedKey(k => k === key ? null : k), 1500);
  }, []);

  const handleSave = useCallback(async (place_id, field, value) => {
    try {
      await fetch(`/api/crm/${encodeURIComponent(place_id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      flashSaved(place_id, field);
    } catch {
      showToast('Save failed', 'error');
    }
  }, [flashSaved, showToast]);

  const handleRemove = useCallback(async (place_id) => {
    try {
      await fetch(`/api/crm/${encodeURIComponent(place_id)}`, { method: 'DELETE' });
      showToast('Removed from CRM', 'info');
      onRefresh();
    } catch {
      showToast('Remove failed', 'error');
    }
  }, [onRefresh, showToast]);

  // ── Empty state (after all hooks) ─────────────────────────────────────────
  if (crmContacts.length === 0) {
    return (
      <div className="card py-24 text-center">
        <Phone size={38} className="mx-auto mb-4 text-ink-ghost" />
        <p className="text-ink-soft text-sm font-medium">No contacts in CRM yet.</p>
        <p className="text-ink-muted text-xs mt-1">
          Go to All Contacts, select businesses, and click "Move to CRM".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div className="flex gap-4">
        {STAT_CARDS.map(({ key, label, color, bg, border }) => (
          <div
            key={key}
            className="flex-1 min-w-0 rounded-card p-4 border text-center"
            style={{ backgroundColor: bg, borderColor: border }}
          >
            <div className="text-2xl font-bold tabular-nums" style={{ color }}>
              {stats[key] ?? 0}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider mt-0.5"
                 style={{ color, opacity: 0.75 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap gap-3 items-center">

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, address…"
              className="input-base pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface border border-line rounded-nav px-3 py-2.5 text-sm text-ink
                       focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 flex-shrink-0"
          >
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-surface border border-line rounded-nav px-3 py-2.5 text-sm text-ink
                       focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 flex-shrink-0"
          >
            <option value="All">All Priorities</option>
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-surface border border-line rounded-nav px-3 py-2.5 text-sm text-ink
                       focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 flex-shrink-0"
          >
            <option value="date">Date Added</option>
            <option value="name">Name</option>
            <option value="priority">Priority</option>
            <option value="updated">Last Updated</option>
          </select>
        </div>

        <p className="text-[11px] text-ink-muted mt-2.5">
          {filtered.length} of {merged.length} lead{merged.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Cards ───────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-ink-soft text-sm">No contacts match the current filters.</p>
          <button
            onClick={() => { setSearch(''); setStatusFilter('All'); setPriorityFilter('All'); }}
            className="mt-2 text-xs text-brand hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <CRMCard
              key={c.place_id}
              c={c}
              savedKey={savedKey}
              onChange={(field, value) => applyEdit(c.place_id, field, value)}
              onSave={(field, value)   => handleSave(c.place_id, field, value)}
              onBlurSave={(field, val) => handleSave(c.place_id, field, val)}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
