import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Mail, Phone, MapPin, Users,
  Trash2, Download, Loader2, ExternalLink, Briefcase, Info,
} from 'lucide-react';
import LinkedInIcon from './LinkedInIcon';
import { getAuthHeader } from '../context/AuthContext';

const API  = import.meta.env.VITE_API_URL ?? '';
const BLUE = '#0077b5';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['Not Contacted', 'Contacted', 'Connected', 'Not Interested'];
const STATUS_COLORS = {
  'Not Contacted':  { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  'Contacted':      { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' },
  'Connected':      { bg: '#f0fdf4', text: '#22c55e', border: '#bbf7d0' },
  'Not Interested': { bg: '#fef2f2', text: '#ef4444', border: '#fecaca' },
};

const LIMITS = [10, 25, 50, 100];

function getInitials(name = '') {
  return name.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';
}

// ── Status banner ─────────────────────────────────────────────────────────────

function StatusBanner({ status }) {
  if (!status) return null;
  const map = {
    success: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    error:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    info:    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  };
  const s = map[status.type] ?? map.info;
  return (
    <div className="mt-4 px-4 py-3 rounded-nav text-sm font-medium border"
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}>
      {status.message}
    </div>
  );
}

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({ c, savedId, onStatus, onDelete }) {
  const cfg = STATUS_COLORS[c.crm_status] ?? STATUS_COLORS['Not Contacted'];

  return (
    <div className="card p-4 lg:p-5 hover:shadow-card-lg transition-shadow duration-150">
      <div className="flex flex-col lg:flex-row gap-4">

        {/* ── Left: avatar + identity ──────────────────────────────────── */}
        <div className="flex gap-3.5 flex-1 min-w-0">
          {c.profile_picture ? (
            <img src={c.profile_picture} alt={c.full_name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: BLUE }}>
              {getInitials(c.full_name)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[16px] font-bold text-ink leading-tight">{c.full_name || '—'}</h3>
              {c.linkedin_url && (
                <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-[11px] font-medium hover:underline"
                  style={{ color: BLUE }}>
                  <LinkedInIcon size={11} /> Profile <ExternalLink size={9} />
                </a>
              )}
            </div>
            {c.headline && <p className="text-[13px] text-ink-soft mt-0.5 leading-snug">{c.headline}</p>}

            {/* Company + title */}
            {(c.current_company || c.current_title) && (
              <div className="flex items-center gap-1.5 text-[13px] text-ink-soft mt-1.5">
                <Briefcase size={12} className="text-ink-muted flex-shrink-0" />
                <span className="truncate">
                  {[c.current_title, c.current_company].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}

            {/* Location + connections */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[12px] text-ink-muted">
              {c.location && (
                <span className="flex items-center gap-1"><MapPin size={11} />{c.location}</span>
              )}
              {c.connections != null && (
                <span className="flex items-center gap-1"><Users size={11} />{c.connections} connections</span>
              )}
            </div>

            {/* Email + phone */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[13px]">
              {c.email ? (
                <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:underline" style={{ color: BLUE }}>
                  <Mail size={12} />{c.email}
                </a>
              ) : (
                <span className="flex items-center gap-1 text-ink-ghost italic text-xs"><Mail size={12} />No email</span>
              )}
              {c.phone ? (
                <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-brand hover:underline">
                  <Phone size={12} />{c.phone}
                </a>
              ) : (
                <span className="flex items-center gap-1 text-ink-ghost italic text-xs"><Phone size={12} />No phone</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: status + actions ──────────────────────────────────── */}
        <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 lg:w-[180px] lg:flex-shrink-0">
          <div className="flex-1 lg:flex-none lg:w-full">
            <div className="relative">
              <select
                value={c.crm_status || 'Not Contacted'}
                onChange={e => onStatus(c.id, e.target.value)}
                className="w-full bg-surface border rounded-nav px-2.5 py-1.5 text-[13px] font-medium
                           focus:outline-none focus:ring-1 cursor-pointer appearance-none"
                style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ backgroundColor: '#fff', color: '#1a1a1a' }}>{s}</option>)}
              </select>
            </div>
            {savedId === c.id && (
              <p className="text-[10px] text-brand mt-1 text-center lg:text-right">✓ saved</p>
            )}
          </div>

          <button
            onClick={() => onDelete(c.id)}
            className="flex items-center gap-1 text-[12px] text-red-400 hover:text-red-600
                       hover:bg-red-50 px-2.5 py-1.5 rounded-nav transition-colors flex-shrink-0"
            title="Delete"
          >
            <Trash2 size={13} />
            <span className="lg:hidden">Delete</span>
          </button>

          {c.scraped_date && (
            <span className="text-[11px] text-ink-muted lg:mt-auto">{c.scraped_date}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── LinkedInTab ───────────────────────────────────────────────────────────────

export default function LinkedInTab({ linkedinContacts, onRefresh, showToast }) {
  const [company,  setCompany]  = useState('');
  const [keyword,  setKeyword]  = useState('');
  const [location, setLocation] = useState('');
  const [limit,    setLimit]    = useState(25);
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState(null);
  const [hasKey,   setHasKey]   = useState(true);
  const [savedId,  setSavedId]  = useState(null);

  useEffect(() => {
    fetch(`${API}/api/linkedin/config`, { headers: getAuthHeader() })
      .then(r => r.json())
      .then(d => setHasKey(d.hasKey))
      .catch(() => {});
  }, []);

  const stats = useMemo(() => ({
    total:     linkedinContacts.length,
    withEmail: linkedinContacts.filter(c => c.email).length,
    withPhone: linkedinContacts.filter(c => c.phone).length,
    runs:      new Set(linkedinContacts.map(c => `${c.keyword_searched}|${c.location_searched}|${c.scraped_date}`)).size,
  }), [linkedinContacts]);

  const handleSearch = async () => {
    if (!company.trim()) {
      setStatus({ type: 'error', message: 'Please enter a company website (e.g. stripe.com).' });
      return;
    }
    setLoading(true);
    const roleLabel = keyword.trim() ? `"${keyword}" employees` : 'employees';
    setStatus({ type: 'info', message: `Searching for ${roleLabel} at ${company}…` });
    try {
      const res  = await fetch(`${API}/api/linkedin/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ company_website: company, keyword, location, limit }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus({ type: 'error', message: data.error || 'Search failed.' }); return; }

      await onRefresh();
      if (data.total_found === 0) {
        setStatus({ type: 'info', message: 'No profiles found. Try a different title or location.' });
      } else {
        setStatus({
          type: 'success',
          message: `Done! Added ${data.added} new contact${data.added !== 1 ? 's' : ''}. Skipped ${data.skipped} duplicate${data.skipped !== 1 ? 's' : ''}.`,
        });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = useCallback(async (id, crm_status) => {
    try {
      await fetch(`${API}/api/linkedin/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ crm_status }),
      });
      setSavedId(id);
      setTimeout(() => setSavedId(s => s === id ? null : s), 1500);
      onRefresh();
    } catch { showToast?.('Status update failed', 'error'); }
  }, [onRefresh, showToast]);

  const handleDelete = useCallback(async (id) => {
    try {
      await fetch(`${API}/api/linkedin/${id}`, { method: 'DELETE', headers: getAuthHeader() });
      showToast?.('Contact deleted', 'info');
      onRefresh();
    } catch { showToast?.('Delete failed', 'error'); }
  }, [onRefresh, showToast]);

  const handleExport = async () => {
    try {
      const res  = await fetch(`${API}/api/linkedin/export`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `linkedin_contacts_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { showToast?.('Export failed', 'error'); }
  };

  const STAT_CARDS = [
    { label: 'Total Profiles', value: stats.total,     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { label: 'With Email',     value: stats.withEmail, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { label: 'With Phone',     value: stats.withPhone, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { label: 'Scrape Runs',    value: stats.runs,      color: '#374151', bg: '#f3f4f6', border: '#e5e7eb' },
  ];

  return (
    <div className="space-y-5">

      {/* ── Setup banner (no API key) ────────────────────────────────────── */}
      {!hasKey && (
        <div className="rounded-card p-4 border flex items-start gap-3"
          style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
          <Info size={18} className="flex-shrink-0 mt-0.5" style={{ color: BLUE }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#1e40af' }}>
              LinkedIn scraping requires a NinjaPear API key.
            </p>
            <p className="text-[13px] text-ink-soft mt-0.5">
              Get yours at nubela.co — sign up for free credits.
            </p>
          </div>
          <a href="https://nubela.co" target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-nav text-xs font-semibold text-white flex-shrink-0"
            style={{ backgroundColor: BLUE }}>
            Setup Guide
          </a>
        </div>
      )}

      {/* ── Search form ──────────────────────────────────────────────────── */}
      <div className="card p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-5">
          <LinkedInIcon size={18} style={{ color: BLUE }} />
          <p className="label-xs">Search LinkedIn Profiles</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block label-xs mb-1.5">Company Website <span className="text-red-400">*</span></label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. stripe.com, microsoft.com" className="input-base" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block label-xs mb-1.5">Job Role <span className="text-ink-muted normal-case font-normal">(optional)</span></label>
              <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. Marketing Manager, Sales Director" className="input-base" />
            </div>
            <div>
              <label className="block label-xs mb-1.5">Location <span className="text-ink-muted normal-case font-normal">(optional)</span></label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. Nigeria, United Kingdom" className="input-base" />
            </div>
          </div>

          <div className="w-full lg:max-w-xs">
            <label className="block label-xs mb-1.5">Results Limit</label>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="input-base">
              {LIMITS.map(l => <option key={l} value={l}>{l} profiles</option>)}
            </select>
          </div>

          <div className="pt-1">
            <button onClick={handleSearch} disabled={loading}
              className="w-full lg:w-auto px-6 py-2.5 rounded-nav text-white font-semibold text-sm
                         flex items-center justify-center gap-2 transition-opacity
                         disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BLUE }}>
              {loading ? <><Loader2 size={15} className="animate-spin" />Searching…</>
                       : <><Search size={15} />Search LinkedIn</>}
            </button>
          </div>
        </div>

        <StatusBanner status={status} />
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:flex gap-3 lg:gap-4">
        {STAT_CARDS.map(({ label, value, color, bg, border }) => (
          <div key={label} className="flex-1 min-w-0 rounded-card p-4 border text-center"
            style={{ backgroundColor: bg, borderColor: border }}>
            <div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider mt-0.5" style={{ color, opacity: 0.75 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      {linkedinContacts.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-ink-soft font-medium">
            {linkedinContacts.length} LinkedIn contact{linkedinContacts.length !== 1 ? 's' : ''}
          </p>
          <button onClick={handleExport} className="btn-primary py-2 px-4 text-xs">
            <Download size={14} />
            <span className="hidden lg:inline">Export Excel</span>
          </button>
        </div>
      )}

      {/* ── Contact list ─────────────────────────────────────────────────── */}
      {linkedinContacts.length === 0 ? (
        <div className="card py-20 text-center">
          <LinkedInIcon size={36} className="mx-auto mb-4" style={{ color: '#cbd5e1' }} />
          <p className="text-ink-soft text-sm font-medium">No LinkedIn contacts yet.</p>
          <p className="text-ink-muted text-xs mt-1">Enter a company website above to find its employees.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {linkedinContacts.map(c => (
            <ProfileCard key={c.id} c={c} savedId={savedId} onStatus={handleStatus} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
