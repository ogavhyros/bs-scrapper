import { useState } from 'react';
import {
  Flame, AlertTriangle, CheckCircle2, BarChart3,
  Search, Loader2, MapPin, Radius,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';

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
    info:    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  };
  const s = map[status.type] ?? map.info;
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
  const [keyword,  setKeyword]  = useState('');
  const [location, setLocation] = useState('');
  const [radius,   setRadius]   = useState(5000);
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState(null);

  const handleScrape = async () => {
    if (!keyword.trim() || !location.trim()) {
      setStatus({ type: 'error', message: 'Please enter a keyword and a target location.' });
      return;
    }
    setLoading(true);
    setStatus({ type: 'info', message: 'Starting scrape…' });

    try {
      // 1. POST to scrape endpoint — response is an SSE stream
      const scrapeRes = await fetch(`${API}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, location, radius }),
      });

      // Pre-SSE validation errors return plain JSON with a non-200 status
      if (!scrapeRes.ok) {
        const err = await scrapeRes.json();
        setStatus({ type: 'error', message: err.error || 'Scrape failed.' });
        return;
      }

      // 2. Read the SSE stream line-by-line
      const reader  = scrapeRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';
      let scrapeData = null;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep any incomplete trailing line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let evt;
          try { evt = JSON.parse(line.slice(6)); } catch { continue; }

          if (evt.type === 'progress') {
            setStatus({ type: 'info', message: evt.message });
          } else if (evt.type === 'error') {
            setStatus({ type: 'error', message: evt.message });
            break outer;
          } else if (evt.type === 'result') {
            scrapeData = evt;
            break outer;
          }
        }
      }

      if (!scrapeData) return; // error already set above

      if (scrapeData.count === 0) {
        setStatus({ type: 'warning', message: 'No results found. Try a different keyword or broader location.' });
        return;
      }

      // 3. Save to DB (INSERT OR IGNORE deduplication)
      const saveRes  = await fetch(`${API}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: scrapeData.results }),
      });
      const saveData = await saveRes.json();

      // 4. Log run
      await fetch(`${API}/api/runs`, {
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
            Up to 100 businesses scraped per run (5 pages × 20)
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
