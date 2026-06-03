import { Clock, Search, MapPin, PlusCircle, MinusCircle, BarChart2 } from 'lucide-react';

// ── Run card ──────────────────────────────────────────────────────────────────

function RunCard({ run, index }) {
  const newPct = run.total > 0 ? Math.round((run.added / run.total) * 100) : 0;

  return (
    <div
      className="card p-5 border-l-[3px] border-l-transparent
                 hover:border-l-brand hover:shadow-card-lg
                 transition-all duration-150"
    >
      <div className="flex items-start gap-4">

        {/* Left: run number */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 w-8">
          <span className="text-[11px] text-ink-muted">#{index + 1}</span>
          <div className="w-8 h-8 rounded-full bg-nav-active flex items-center justify-center">
            <Clock size={14} className="text-ink-soft" />
          </div>
        </div>

        {/* Center: details */}
        <div className="flex-1 min-w-0">

          {/* Keyword + location */}
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="flex items-center gap-1 text-sm font-semibold text-ink">
              <Search size={13} className="text-ink-muted" />
              {run.keyword}
            </span>
            <span className="text-ink-muted text-xs">in</span>
            <span className="flex items-center gap-1 text-sm text-ink-soft">
              <MapPin size={13} className="text-ink-muted" />
              {run.location}
            </span>
          </div>

          <p className="text-[11px] text-ink-muted mb-3">{run.date}</p>

          {/* Progress bar */}
          {run.total > 0 && (
            <>
              <div className="h-1.5 bg-nav-active rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${newPct}%` }}
                />
              </div>
              <p className="text-[11px] text-ink-muted">{newPct}% new contacts</p>
            </>
          )}
        </div>

        {/* Right: stats */}
        <div className="flex gap-3 lg:gap-4 flex-shrink-0 flex-wrap justify-end">
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <PlusCircle size={12} className="text-normal-text" />
              <span className="text-xl font-bold text-normal-text tabular-nums">
                {run.added}
              </span>
            </div>
            <div className="text-[10px] text-ink-muted uppercase tracking-wider">added</div>
          </div>

          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <MinusCircle size={12} className="text-ink-muted" />
              <span className="text-xl font-bold text-ink-soft tabular-nums">
                {run.skipped}
              </span>
            </div>
            <div className="text-[10px] text-ink-muted uppercase tracking-wider">skipped</div>
          </div>

          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <BarChart2 size={12} className="text-brand" />
              <span className="text-xl font-bold text-brand tabular-nums">
                {run.total}
              </span>
            </div>
            <div className="text-[10px] text-ink-muted uppercase tracking-wider">found</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="card py-20 text-center">
      <Clock size={36} className="mx-auto mb-4 text-ink-ghost" />
      <p className="text-ink-soft text-sm font-medium">No scrape history yet.</p>
      <p className="text-ink-muted text-xs mt-1">Your first scrape run will appear here.</p>
    </div>
  );
}

// ── HistoryTab ────────────────────────────────────────────────────────────────

export default function HistoryTab({ runs }) {
  if (runs.length === 0) return <EmptyState />;

  const totalAdded   = runs.reduce((s, r) => s + (r.added   ?? 0), 0);
  const totalSkipped = runs.reduce((s, r) => s + (r.skipped ?? 0), 0);
  const totalFound   = runs.reduce((s, r) => s + (r.total   ?? 0), 0);

  return (
    <div className="space-y-5">

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: 'Total Runs',    value: runs.length, color: '#374151', bg: '#f3f4f6', border: '#e5e7eb' },
          { label: 'Total Added',   value: totalAdded,  color: '#2ab55d', bg: '#E3F0A3', border: '#BADBA2' },
          { label: 'Total Skipped', value: totalSkipped,color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
          { label: 'Total Found',   value: totalFound,  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
        ].map(({ label, value, color, bg, border }) => (
          <div
            key={label}
            className="rounded-card p-4 border text-center"
            style={{ backgroundColor: bg, borderColor: border }}
          >
            <div
              className="text-2xl font-bold tabular-nums"
              style={{ color }}
            >
              {value}
            </div>
            <div
              className="text-[11px] uppercase tracking-wider mt-1"
              style={{ color, opacity: 0.7 }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Run list ────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {runs.map((run, i) => (
          <RunCard key={run.id} run={run} index={i} />
        ))}
      </div>
    </div>
  );
}
