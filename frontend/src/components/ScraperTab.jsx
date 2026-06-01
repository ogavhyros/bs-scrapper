import { useState } from 'react';
import {
  Flame, AlertTriangle, CheckCircle2, BarChart3,
  Eye, EyeOff, Search, Loader2, KeyRound, MapPin, Radius,
} from 'lucide-react';

// ── Priority stat cards ───────────────────────────────────────────────────────

const PRIORITY_CARDS = [
  {
    key:    'critical',
    label:  'No Data',
    icon:   Flame,
    bg:     '#fee2e2',
    text:   '#dc2626',
    border: '#fecaca',
  },
  {
    key:    'high',
    label:  'Partial',
    icon:   AlertTriangle,
    bg:     '#fef3c7',
    text:   '#d97706',
    border: '#fde68a',
  },
  {
    key:    'normal',
    label:  'Complete',
    icon:   CheckCircle2,
    bg:     '#f0fdf4',
    text:   '#16a34a',
    border: '#bbf7d0',
  },
  {
    key:    'total',
    label:  'Total',
    icon:   BarChart3,
    bg:     '#f3f4f6',
    text:   '#374151',
    border: '#e5e7eb',
  },
];

function PriorityCard({ config, count }) {
  const { label, icon: Icon, bg, text, border } = config;
  return (
    <div
      className="flex-1 min-w-0 rounded-card p-4 border"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: text }}
        >
          {label}
        </span>
        <Icon size={16} style={{ color: text }} className="opacity-70" />
      </div>
      <div className="text-3xl font-bold tabular-nums" style={{ color: text }}>
        {count}
      </div>
      <div className="text-[11px] mt-0.5" style={{ color: text, opacity: 0.7 }}>
        contacts
      </div>
    </div>
  );
}

// ── Status banner ─────────────────────────────────────────────────────────────

function StatusBanner({ status }) {
  if (!status) return null;
  const map = {
    success: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    error:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    warning: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  };
  const s = map[status.type] ?? map.warning;
  return (
    <div
      className="mt-4 px-4 py-3 rounded-nav text-sm font-medium border"
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
    >
      {status.message}
    </div>
  );
}

// ── Radius options ────────────────────────────────────────────────────────────

const RADII = [
  { label: '1 km',  value: 1000  },
  { label: '5 km',  value: 5000  },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
  { label: '50 km', value: 50000 },
];

// ── ScraperTab ────────────────────────────────────────────────────────────────

export default function ScraperTab({ stats, onRefresh }) {
  const [apiKey,   setApiKey]   = useState('');
  const [showKey,  setShowKey]  = useState(false);
  const [keyword,  setKeyword]  = useState('');
  const [location, setLocation] = useState('');
  const [radius,   setRadius]   = useState(5000);
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState(null);

  const handleScrape = async () => {
    if (!apiKey.trim() || !keyword.trim() || !location.trim()) {
      setStatus({ type: 'error', message: 'Please fill in all three fields: API key, keyword, and location.' });
      return;
    }
    setLoading(true);
    setStatus(null);

    try {
      // 1. Fetch from Google Places
      const scrapeRes  = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, keyword, location, radius }),
      });
      const scrapeData = await scrapeRes.json();

      if (!scrapeRes.ok) {
        setStatus({ type: 'error', message: scrapeData.error || 'Scrape failed.' });
        return;
      }
      if (scrapeData.count === 0) {
        setStatus({ type: 'warning', message: 'No results found. Try a different keyword or broader location.' });
        return;
      }

      // 2. Save (INSERT OR IGNORE deduplication)
      const saveRes  = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: scrapeData.results }),
      });
      const saveData = await saveRes.json();

      // 3. Log run
      await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword, location,
          date:    new Date().toISOString().split('T')[0],
          added:   saveData.added,
          skipped: saveData.skipped,
          total:   scrapeData.count,
        }),
      });

      await onRefresh();

      const n = (v, w) => `${v} ${w}${v !== 1 ? 's' : ''}`;
      setStatus({
        type: 'success',
        message: `✓ Added ${n(saveData.added, 'new contact')} · ${n(saveData.skipped, 'duplicate')} skipped · ${scrapeData.count} total found`,
      });
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Priority stat row ───────────────────────────────────────────── */}
      <div className="flex gap-4">
        {PRIORITY_CARDS.map(cfg => (
          <PriorityCard key={cfg.key} config={cfg} count={stats[cfg.key] ?? stats.total} />
        ))}
      </div>

      {/* ── Search form card ────────────────────────────────────────────── */}
      <div className="card p-6">

        <p className="label-xs mb-5">Configure Scrape</p>

        <div className="space-y-4">

          {/* API Key */}
          <div>
            <label className="block label-xs mb-1.5">
              <span className="flex items-center gap-1.5">
                <KeyRound size={11} />
                Google Places API Key
              </span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="input-base pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted
                           hover:text-ink-soft transition-colors"
                tabIndex={-1}
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Keyword + Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block label-xs mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Search size={11} />
                  Business Keyword
                </span>
              </label>
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScrape()}
                placeholder="e.g., plumbers, dentists, cafés"
                className="input-base"
              />
            </div>
            <div>
              <label className="block label-xs mb-1.5">
                <span className="flex items-center gap-1.5">
                  <MapPin size={11} />
                  Target Location
                </span>
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScrape()}
                placeholder="e.g., Austin, TX"
                className="input-base"
              />
            </div>
          </div>

          {/* Radius */}
          <div className="max-w-xs">
            <label className="block label-xs mb-1.5">
              <span className="flex items-center gap-1.5">
                <Radius size={11} />
                Search Radius
              </span>
            </label>
            <select
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="input-base"
            >
              {RADII.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <div className="pt-1">
            <button onClick={handleScrape} disabled={loading} className="btn-primary px-6">
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Running Scrape…
                </>
              ) : (
                <>
                  <Search size={15} />
                  Run Scrape
                </>
              )}
            </button>
          </div>
        </div>

        <StatusBanner status={status} />
      </div>

      {/* ── Tips card ───────────────────────────────────────────────────── */}
      <div className="card px-6 py-4">
        <p className="label-xs mb-3">Tips</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1.5 text-sm text-ink-soft">
          <li className="flex gap-2 items-start">
            <span className="text-ink-ghost mt-0.5">·</span>
            Be specific: "plumbers Austin" works better than "services"
          </li>
          <li className="flex gap-2 items-start">
            <span className="text-ink-ghost mt-0.5">·</span>
            Up to 10 businesses scraped per run
          </li>
          <li className="flex gap-2 items-start">
            <span className="text-ink-ghost mt-0.5">·</span>
            Contacts deduplicated automatically by Google Place ID
          </li>
          <li className="flex gap-2 items-start">
            <span className="text-ink-ghost mt-0.5">·</span>
            Completeness tracks whether phone and website were found
          </li>
        </ul>
      </div>
    </div>
  );
}
