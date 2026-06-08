import { useState, useMemo, useCallback } from 'react';
import { Phone, Globe, MapPin, Star, Trash2, Search, Pencil, X, Check, Loader2 } from 'lucide-react';
import { getAuthHeader } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS   = ['Not Called', 'Called', 'Follow Up', 'Converted', 'Interested', 'Not Interested'];
const PRIORITY_OPTIONS = ['Cold', 'Warm', 'Hot'];
const OUTCOME_OPTIONS  = [
  'Interested', 'Not Interested', 'No Answer', 'Voicemail', 'Wrong Number',
  'Callback Requested', 'Meeting Scheduled', 'Proposal Sent',
];
const ACTION_OPTIONS   = [
  'Call Again', 'Send Proposal', 'Schedule Meeting',
  'Follow Up Email', 'Remove from List', 'Mark as Converted',
];

const STATUS_COLORS = {
  'Not Called':     { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  'Called':         { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  'Follow Up':      { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  'Converted':      { bg: '#f3e8ff', text: '#6b21a8', border: '#ddd6fe' },
  'Interested':     { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  'Not Interested': { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
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
  { key: 'called',    label: 'Called',     color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
  { key: 'followUp',  label: 'Follow Up',  color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  { key: 'converted', label: 'Converted',  color: '#6b21a8', bg: '#f3e8ff', border: '#ddd6fe' },
];

const FILTER_TABS = [
  { key: 'All',           label: 'All'           },
  { key: 'Not Called',    label: 'Not Called'    },
  { key: 'Follow Up',     label: 'Follow Up'     },
  { key: 'Called',        label: 'Called'        },
  { key: 'Converted',     label: 'Converted'     },
  { key: 'Interested',    label: 'Interested'    },
];

const ci = 'bg-surface border border-line rounded-nav px-3 py-1.5 text-[13px] text-ink w-full ' +
           'placeholder-ink-ghost focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20';

function getInitials(name = '') {
  return name.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';
}

// ── CRM Card ──────────────────────────────────────────────────────────────────

function CRMCard({
  c, isEditing, editValues,
  onEditStart, onEditChange, onSave, onCancel, onRemove,
  saving, selected, onSelect,
}) {
  const avatarBg = AVATAR_COLORS[
    Math.abs((c.id ?? 0) + (c.name?.charCodeAt(0) ?? 0)) % AVATAR_COLORS.length
  ];

  const displayStatus   = isEditing ? (editValues.status   ?? c.status   ?? 'Not Called') : (c.status   || 'Not Called');
  const displayPriority = isEditing ? (editValues.priority ?? c.priority ?? 'Cold')       : (c.priority || 'Cold');
  const statusCfg = STATUS_COLORS[displayStatus]   ?? STATUS_COLORS['Not Called'];
  const priMeta   = PRIORITY_META[displayPriority] ?? PRIORITY_META.Cold;

  const displayOutcome = isEditing ? (editValues.outcome ?? '') : (c.outcome || '');

  return (
    <div
      className="card p-4 lg:p-5 hover:shadow-card-lg transition-all duration-150 relative"
      style={isEditing ? { borderLeft: '3px solid #22c55e' } : {}}
    >
      {/* Checkbox */}
      <div className="absolute top-4 left-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="w-4 h-4 rounded accent-brand cursor-pointer"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 pl-7">

        {/* ── Left: Business info ────────────────────────────────────────── */}
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

            {/* Status + Priority + Outcome pills */}
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <span
                className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold border"
                style={{ backgroundColor: statusCfg.bg, color: statusCfg.text, borderColor: statusCfg.border }}
              >
                ● {displayStatus}
              </span>
              <span className="text-[13px] font-medium" style={{ color: priMeta.text }}>
                {priMeta.icon} {displayPriority}
              </span>
              {displayOutcome ? (
                <span className="px-2 py-0.5 bg-nav-active text-ink-soft text-[11px] rounded-full border border-line">
                  {displayOutcome}
                </span>
              ) : null}
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

            {/* VIEW MODE: notes preview + metadata tags */}
            {!isEditing && (
              <div className="mt-2 space-y-1">
                {c.notes ? (
                  <p className="text-xs text-ink-muted italic">
                    "{c.notes.length > 60 ? c.notes.slice(0, 60) + '…' : c.notes}"
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  {c.next_action ? (
                    <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">
                      → {c.next_action}
                    </span>
                  ) : null}
                  {c.call_date ? (
                    <span className="text-[11px] px-2 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">
                      📅 {c.call_date}
                    </span>
                  ) : null}
                  {c.contact_person ? (
                    <span className="text-[11px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded border border-purple-100">
                      👤 {c.contact_person}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divider — desktop only */}
        <div className="hidden lg:block w-px bg-line flex-shrink-0 self-stretch" />

        {/* ── Right: VIEW buttons or EDIT form ─────────────────────────── */}
        {isEditing ? (
          <div className="w-full lg:w-[350px] lg:flex-shrink-0 space-y-2.5">

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label-xs block mb-1">Status</label>
                <select
                  value={editValues.status ?? ''}
                  onChange={e => onEditChange('status', e.target.value)}
                  className={ci}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label-xs block mb-1">Priority</label>
                <select
                  value={editValues.priority ?? ''}
                  onChange={e => onEditChange('priority', e.target.value)}
                  className={ci}
                >
                  {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Call Date + Contact Person */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label-xs block mb-1">Call Date</label>
                <input
                  type="date"
                  value={editValues.call_date ?? ''}
                  onChange={e => onEditChange('call_date', e.target.value)}
                  className={ci}
                />
              </div>
              <div>
                <label className="label-xs block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editValues.contact_person ?? ''}
                  placeholder="Name"
                  onChange={e => onEditChange('contact_person', e.target.value)}
                  className={ci}
                />
              </div>
            </div>

            {/* Outcome + Next Action */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label-xs block mb-1">Outcome</label>
                <select
                  value={editValues.outcome ?? ''}
                  onChange={e => onEditChange('outcome', e.target.value)}
                  className={ci}
                >
                  <option value="">—</option>
                  {OUTCOME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="label-xs block mb-1">Next Action</label>
                <select
                  value={editValues.next_action ?? ''}
                  onChange={e => onEditChange('next_action', e.target.value)}
                  className={ci}
                >
                  <option value="">—</option>
                  {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="label-xs block mb-1">Notes</label>
              <textarea
                value={editValues.notes ?? ''}
                placeholder="Call notes…"
                rows={3}
                onChange={e => onEditChange('notes', e.target.value)}
                className={`${ci} resize-none`}
              />
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-nav text-[13px] font-semibold
                           bg-brand text-white hover:bg-brand/90 transition-colors disabled:opacity-60"
              >
                {saving
                  ? <><Loader2 size={13} className="animate-spin" />Saving…</>
                  : <><Check size={13} />Save</>
                }
              </button>
              <button
                onClick={onCancel}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-nav text-[13px] font-semibold
                           bg-surface border border-line text-ink-soft hover:bg-nav-active transition-colors"
              >
                <X size={13} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // VIEW MODE buttons
          <div className="flex lg:flex-col items-start lg:items-end justify-end gap-2 lg:w-auto lg:self-start">
            <button
              onClick={onEditStart}
              className="flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-ink
                         hover:bg-nav-active px-2.5 py-1.5 rounded-nav border border-line transition-colors"
            >
              <Pencil size={12} />
              Edit
            </button>
            <button
              onClick={() => onRemove(c.place_id)}
              className="flex items-center gap-1.5 text-[12px] text-red-400 hover:text-red-600
                         hover:bg-red-50 px-2.5 py-1.5 rounded-nav border border-red-200 transition-colors"
            >
              <Trash2 size={12} />
              Remove
            </button>
          </div>
        )}
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

  // Edit-mode state (one card at a time)
  const [editingId,  setEditingId]  = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving,     setSaving]     = useState(false);

  // Bulk selection
  const [selected,   setSelected]   = useState(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  // Optimistic local edits after save
  const [localEdits, setLocalEdits] = useState({});

  const merged = useMemo(() =>
    crmContacts.map(c => ({ ...c, ...(localEdits[c.place_id] ?? {}) })),
    [crmContacts, localEdits],
  );

  const stats = useMemo(() => {
    const s = { total: merged.length, notCalled: 0, called: 0, followUp: 0, converted: 0 };
    for (const c of merged) {
      const st = c.status || 'Not Called';
      if (st === 'Not Called')    s.notCalled++;
      else if (st === 'Called')   s.called++;
      else if (st === 'Follow Up') s.followUp++;
      else if (st === 'Converted') s.converted++;
    }
    return s;
  }, [merged]);

  const tabCounts = useMemo(() => {
    const counts = { All: merged.length };
    for (const c of merged) {
      const st = c.status || 'Not Called';
      counts[st] = (counts[st] ?? 0) + 1;
    }
    return counts;
  }, [merged]);

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

  // Edit handlers
  const startEdit = useCallback((c) => {
    setEditingId(c.place_id);
    setEditValues({
      status:         c.status         || 'Not Called',
      priority:       c.priority       || 'Cold',
      outcome:        c.outcome        || '',
      notes:          c.notes          || '',
      next_action:    c.next_action    || '',
      call_date:      c.call_date      || '',
      contact_person: c.contact_person || '',
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValues({});
  }, []);

  const handleSave = useCallback(async (place_id) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/crm/${encodeURIComponent(place_id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(editValues),
      });
      if (!res.ok) throw new Error('Save failed');
      setLocalEdits(prev => ({ ...prev, [place_id]: { ...editValues } }));
      setEditingId(null);
      setEditValues({});
      showToast('Contact updated successfully', 'success');
    } catch {
      showToast('Failed to save. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  }, [editValues, showToast]);

  const handleRemove = useCallback(async (place_id) => {
    try {
      await fetch(`${API}/api/crm/${encodeURIComponent(place_id)}`, {
        method: 'DELETE', headers: getAuthHeader(),
      });
      showToast('Removed from CRM', 'info');
      onRefresh();
    } catch {
      showToast('Remove failed', 'error');
    }
  }, [onRefresh, showToast]);

  // Bulk selection
  const allFilteredIds = useMemo(() => filtered.map(c => c.place_id), [filtered]);
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected   = allFilteredIds.some(id => selected.has(id));

  const toggleSelect = useCallback((place_id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(place_id)) next.delete(place_id); else next.add(place_id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected(prev => {
      if (allFilteredIds.every(id => prev.has(id))) {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.delete(id));
        return next;
      }
      return new Set([...prev, ...allFilteredIds]);
    });
  }, [allFilteredIds]);

  const handleBulkStatus = useCallback(async (status) => {
    const ids = [...selected].filter(id => allFilteredIds.includes(id));
    if (ids.length === 0) return;
    setBulkSaving(true);
    try {
      const res = await fetch(`${API}/api/crm/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ place_ids: ids, status }),
      });
      if (!res.ok) throw new Error('Bulk update failed');
      setLocalEdits(prev => {
        const next = { ...prev };
        ids.forEach(id => { next[id] = { ...(next[id] ?? {}), status }; });
        return next;
      });
      setSelected(new Set());
      showToast(`${ids.length} contact${ids.length !== 1 ? 's' : ''} updated to "${status}"`, 'success');
    } catch {
      showToast('Bulk update failed', 'error');
    } finally {
      setBulkSaving(false);
    }
  }, [selected, allFilteredIds, showToast]);

  // ── Empty state ────────────────────────────────────────────────────────────
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

  const selectedInView = [...selected].filter(id => allFilteredIds.includes(id));

  return (
    <div className="space-y-5">

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div className="flex gap-3 lg:gap-4 overflow-x-auto pb-1 lg:pb-0">
        {STAT_CARDS.map(({ key, label, color, bg, border }) => (
          <div
            key={key}
            className="min-w-[88px] flex-shrink-0 lg:flex-1 lg:min-w-0 rounded-card p-3 lg:p-4 border text-center"
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

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
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

        {/* Status filter tabs */}
        <div className="flex gap-1.5 flex-wrap mt-3">
          {FILTER_TABS.map(({ key, label }) => {
            const count  = tabCounts[key] ?? 0;
            const active = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors ${
                  active
                    ? 'bg-brand text-white border-brand'
                    : 'bg-surface text-ink-soft border-line hover:bg-nav-active'
                }`}
              >
                {label} <span className={active ? 'opacity-75' : 'opacity-50'}>{count}</span>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-ink-muted mt-2.5">
          {filtered.length} of {merged.length} lead{merged.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Bulk action bar (shown when items are selected) ───────────────── */}
      {someSelected && (
        <div className="card px-4 py-3 border-brand/30 bg-brand/5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-ink">
              {selectedInView.length} contact{selectedInView.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleBulkStatus('Called')}
                disabled={bulkSaving}
                className="px-3 py-1.5 text-[12px] font-semibold rounded-nav bg-green-600 text-white
                           hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                Mark as Called
              </button>
              <button
                onClick={() => handleBulkStatus('Follow Up')}
                disabled={bulkSaving}
                className="px-3 py-1.5 text-[12px] font-semibold rounded-nav bg-amber-500 text-white
                           hover:bg-amber-600 disabled:opacity-60 transition-colors"
              >
                Mark as Follow Up
              </button>
              <button
                onClick={() => handleBulkStatus('Not Interested')}
                disabled={bulkSaving}
                className="px-3 py-1.5 text-[12px] font-semibold rounded-nav bg-red-500 text-white
                           hover:bg-red-600 disabled:opacity-60 transition-colors"
              >
                Mark as Not Interested
              </button>
            </div>
            <button
              onClick={() => setSelected(new Set())}
              className="text-[12px] text-ink-muted hover:text-ink underline ml-auto"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* ── Select-all row ───────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded accent-brand cursor-pointer"
          />
          <span className="text-[12px] text-ink-muted select-none">
            {allSelected ? 'Deselect all' : 'Select all visible'}
          </span>
        </div>
      )}

      {/* ── Cards ────────────────────────────────────────────────────────── */}
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
              isEditing={editingId === c.place_id}
              editValues={editValues}
              onEditStart={() => startEdit(c)}
              onEditChange={(field, value) => setEditValues(prev => ({ ...prev, [field]: value }))}
              onSave={() => handleSave(c.place_id)}
              onCancel={cancelEdit}
              onRemove={handleRemove}
              saving={saving}
              selected={selected.has(c.place_id)}
              onSelect={() => toggleSelect(c.place_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
