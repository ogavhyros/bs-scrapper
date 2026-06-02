import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Download, Trash2, Phone, Globe,
  MapPin, Star, Flame, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { getPriority } from '../App';
import { getAuthHeader } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#3b82f6','#8b5cf6','#f59e0b','#10b981',
  '#ef4444','#6366f1','#0ea5e9','#ec4899',
];

function getInitials(name = '') {
  return name.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';
}

function formatType(t) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const PRIORITY_CONFIG = {
  critical: { icon: Flame,         label: 'NO DATA',  status: '● No Contact Data', bg: '#fee2e2', text: '#dc2626', border: '#fecaca' },
  high:     { icon: AlertTriangle, label: 'PARTIAL',  status: '● Partial Data',    bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
  normal:   { icon: CheckCircle2,  label: 'COMPLETE', status: '● Complete',        bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

const COMPLETENESS_LABEL = { critical: 'no-data', high: 'partial', normal: 'complete' };

const FILTER_OPTS = [
  { id: 'all',      label: 'All'      },
  { id: 'critical', label: 'No Data'  },
  { id: 'high',     label: 'Partial'  },
  { id: 'normal',   label: 'Complete' },
];

// ── Business card ─────────────────────────────────────────────────────────────

function BusinessCard({ contact, index, selected, onToggle, inCrm }) {
  const priority = getPriority(contact);
  const cfg      = PRIORITY_CONFIG[priority];
  const Icon     = cfg.icon;
  const initials = getInitials(contact.name);
  const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length];

  const typeTags = contact.types
    ? contact.types.split(',').filter(Boolean).slice(0, 4)
    : [];

  return (
    <div
      className={`card p-3 lg:p-5 border-l-[3px] hover:shadow-card-lg transition-all duration-150 cursor-default
                  ${selected ? 'border-l-brand bg-green-50/30' : 'border-l-transparent hover:border-l-amber-400'}`}
    >
      <div className="flex gap-2 lg:gap-4">

        {/* ── Checkbox ─────────────────────────────────────────────────── */}
        <div className="flex items-start pt-1.5 flex-shrink-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            onClick={e => e.stopPropagation()}
            className="w-4 h-4 rounded cursor-pointer accent-brand"
          />
        </div>

        {/* ── Left: index + avatar ──────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-10">
          <span className="text-[11px] text-ink-muted font-medium">#{index + 1}</span>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center
                       text-white font-bold text-[13px] flex-shrink-0"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
        </div>

        {/* ── Center: all info ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Name row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="text-[18px] font-bold text-ink leading-tight">
              {contact.name || '—'}
            </h3>
            <span
              className="priority-badge flex items-center gap-1"
              style={{ backgroundColor: cfg.bg, color: cfg.text }}
            >
              <Icon size={10} />
              {cfg.label}
            </span>
            <span
              className="status-pill"
              style={{ backgroundColor: cfg.bg, color: cfg.text }}
            >
              {cfg.status}
            </span>
            {inCrm && (
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                style={{ backgroundColor: '#f0fdf4', color: '#22c55e', borderColor: '#bbf7d0' }}
              >
                In CRM ✓
              </span>
            )}
          </div>

          {/* Phone + Website */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft mb-2.5">
            <span className="flex items-center gap-1.5">
              <Phone size={13} className="flex-shrink-0" />
              {contact.phone ? (
                <a href={`tel:${contact.phone}`} className="hover:text-brand transition-colors">
                  {contact.phone}
                </a>
              ) : (
                <span className="text-ink-ghost italic text-xs">No phone</span>
              )}
            </span>
            <span className="flex items-center gap-1.5 min-w-0">
              <Globe size={13} className="flex-shrink-0" />
              {contact.website ? (
                <a
                  href={contact.website} target="_blank" rel="noopener noreferrer"
                  className="hover:text-brand transition-colors truncate max-w-[220px]"
                >
                  {contact.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              ) : (
                <span className="text-ink-ghost italic text-xs">No website</span>
              )}
            </span>
          </div>

          {/* Type tags */}
          {typeTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {typeTags.map(t => (
                <span key={t} className="px-2.5 py-0.5 bg-nav-active text-ink-soft text-[12px] rounded-full">
                  {formatType(t)}
                </span>
              ))}
            </div>
          )}

          {/* Address */}
          {contact.address && (
            <div className="flex items-start gap-2">
              <span className="label-xs mt-0.5 flex-shrink-0 flex items-center gap-1">
                <MapPin size={9} />
                Notes
              </span>
              <span className="text-[12px] text-ink-muted leading-relaxed">
                {contact.address}
              </span>
            </div>
          )}
        </div>

        {/* ── Right: rating + date ──────────────────────────────────────── */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {contact.rating != null && (
            <div className="flex items-center gap-1">
              <Star size={13} className="text-amber-400 fill-amber-400" />
              <span className="text-sm font-semibold text-ink">
                {Number(contact.rating).toFixed(1)}
              </span>
            </div>
          )}
          {contact.scraped_date && (
            <span className="text-[11px] text-ink-muted mt-0.5">{contact.scraped_date}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ filtered }) {
  return (
    <div className="card py-20 text-center">
      <Search size={36} className="mx-auto mb-4 text-ink-ghost" />
      <p className="text-ink-soft text-sm font-medium">
        {filtered ? 'No contacts match your filter.' : 'No contacts yet.'}
      </p>
      <p className="text-ink-muted text-xs mt-1">
        {filtered
          ? 'Try clearing the search or changing the completeness filter.'
          : 'Run a scrape from the Contact Scraper to get started.'}
      </p>
    </div>
  );
}

// ── ContactsTab ───────────────────────────────────────────────────────────────

export default function ContactsTab({ contacts, onRefresh, crmPlaceIds, showToast }) {
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [clearing, setClearing] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [moving,   setMoving]   = useState(false);

  const selectAllRef = useRef(null);

  const filtered = useMemo(() => {
    let list = contacts;
    if (filter !== 'all') list = list.filter(c => getPriority(c) === filter);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter(c =>
      (c.name    || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q) ||
      (c.phone   || '').includes(q)               ||
      (c.website || '').toLowerCase().includes(q) ||
      (c.types   || '').toLowerCase().includes(q)
    );
    return list;
  }, [contacts, search, filter]);

  const allFilteredSelected  = filtered.length > 0 && filtered.every(c => selected.has(c.place_id));
  const someFilteredSelected = filtered.some(c => selected.has(c.place_id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected && !allFilteredSelected;
    }
  }, [someFilteredSelected, allFilteredSelected]);

  const handleToggle = (place_id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(place_id)) next.delete(place_id); else next.add(place_id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach(c => next.delete(c.place_id));
      else                     filtered.forEach(c => next.add(c.place_id));
      return next;
    });
  };

  const handleMoveTocrm = async () => {
    const place_ids = [...selected];
    setMoving(true);
    try {
      const res  = await fetch(`${API}/api/crm/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ place_ids }),
      });
      const data = await res.json();
      showToast(`${data.added} contact${data.added !== 1 ? 's' : ''} added to CRM`, 'success');
      setSelected(new Set());
      await onRefresh();
    } catch {
      showToast('Failed to move contacts to CRM', 'error');
    } finally {
      setMoving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res  = await fetch(`${API}/api/export`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `business_contacts_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error('Export failed:', e); }
  };

  const handleClear = async () => {
    if (!window.confirm('Delete ALL contacts and run history?\nThis cannot be undone.')) return;
    setClearing(true);
    try {
      await fetch(`${API}/api/clear`, { method: 'DELETE', headers: getAuthHeader() });
      await onRefresh();
      setSearch('');
      setFilter('all');
      setSelected(new Set());
    } catch (e) { console.error('Clear failed:', e); }
    finally     { setClearing(false); }
  };

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="card px-4 py-3">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">

          {/* Select All + Search */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allFilteredSelected}
              onChange={handleSelectAll}
              disabled={filtered.length === 0}
              className="w-4 h-4 rounded cursor-pointer accent-brand flex-shrink-0"
              title="Select all visible"
            />
            <div className="relative flex-1 min-w-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone, website, address…"
                className="input-base pl-9"
              />
            </div>
          </div>

          {/* Priority filters */}
          <div className="flex gap-1.5 flex-shrink-0">
            {FILTER_OPTS.map(f => {
              const cfg      = PRIORITY_CONFIG[f.id];
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={isActive
                    ? { backgroundColor: cfg?.bg ?? '#1a1a1a', color: cfg?.text ?? '#ffffff', border: `1px solid ${cfg?.border ?? 'transparent'}` }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleExport}
              disabled={contacts.length === 0}
              className="btn-primary"
              title="Export Excel"
            >
              <Download size={15} />
              <span className="hidden lg:inline">Export Excel</span>
            </button>
            <button
              onClick={handleClear}
              disabled={clearing || contacts.length === 0}
              className="btn-ghost hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              title="Clear All"
            >
              <Trash2 size={15} />
              <span className="hidden lg:inline">Clear All</span>
            </button>
          </div>
        </div>

        {/* Result count */}
        <p className="text-[11px] text-ink-muted mt-2.5">
          {filter !== 'all'
            ? `${filtered.length} ${COMPLETENESS_LABEL[filter] ?? filter} contact${filtered.length !== 1 ? 's' : ''} of ${contacts.length} total`
            : `${filtered.length} of ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`
          }
          {selected.size > 0 && (
            <span className="ml-2 text-brand font-semibold">· {selected.size} selected</span>
          )}
        </p>
      </div>

      {/* ── Action bar (shown when contacts are selected) ────────────────── */}
      {selected.size > 0 && (
        <div
          className="rounded-card px-5 py-3 flex items-center justify-between border shadow-card"
          style={{ backgroundColor: '#f0fdf4', borderColor: '#22c55e' }}
        >
          <span className="text-sm font-semibold text-ink">
            {selected.size} contact{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-ink-muted hover:text-ink transition-colors"
            >
              Clear selection
            </button>
            <button
              onClick={handleMoveTocrm}
              disabled={moving}
              className="btn-primary py-1.5 px-4 text-xs"
            >
              {moving ? 'Moving…' : 'Move to CRM →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Cards ───────────────────────────────────────────────────────── */}
      {contacts.length === 0 ? (
        <EmptyState filtered={false} />
      ) : filtered.length === 0 ? (
        <EmptyState filtered />
      ) : (
        <div className="space-y-3">
          {filtered.map((c, i) => (
            <BusinessCard
              key={c.id}
              contact={c}
              index={i}
              selected={selected.has(c.place_id)}
              onToggle={() => handleToggle(c.place_id)}
              inCrm={crmPlaceIds?.has(c.place_id) ?? false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
