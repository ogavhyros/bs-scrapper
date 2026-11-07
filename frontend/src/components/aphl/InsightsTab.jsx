import { useState, useEffect, useCallback } from 'react';
import { getAuthHeader } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

const fmt   = (v) => `₦${Number(v || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
const fmtKm = (v) => `${Number(v || 0).toLocaleString('en-NG', { maximumFractionDigits: 1 })} km`;
const fmtPct= (v) => `${Number(v || 0).toFixed(1)}%`;

const SEVERITY = {
  high:   { label: 'High priority', color: '#dc2626', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.3)'  },
  medium: { label: 'Worth a look',  color: '#b45309', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)' },
  low:    { label: 'Minor',         color: '#4b5563', bg: 'rgba(107,114,128,0.08)',border: 'rgba(107,114,128,0.25)'},
  info:   { label: 'All clear',     color: '#15803d', bg: 'rgba(22,163,74,0.08)',  border: 'rgba(22,163,74,0.3)'  },
};

function MetricCard({ label, value, sub, textColor, bg }) {
  return (
    <div style={{ flex: '1 1 180px', background: bg, borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: textColor, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: textColor, letterSpacing: '-0.4px', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: textColor, opacity: 0.65, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
        {title}
      </div>
      <div style={{ padding: 4 }}>{children}</div>
    </div>
  );
}

export default function InsightsTab() {
  const [days,   setDays]   = useState(90);
  const [target, setTarget] = useState(20);
  const [data,   setData]   = useState(null);
  const [loading,setLoading]= useState(true);
  const [error,  setError]  = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetch(`${API}/api/aphl/unit-economics?days=${days}&target_margin=${target}`, { headers: getAuthHeader() })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to load insights');
        return d;
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [days, target]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Period</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[30, 90, 180, 365].map(d => (
              <button key={d} onClick={() => setDays(d)}
                style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${days === d ? '#7c3aed' : 'var(--border)'}`,
                  background: days === d ? 'rgba(124,58,237,0.08)' : 'var(--bg-input)',
                  color: days === d ? '#7c3aed' : 'var(--text-secondary)' }}>
                {d === 365 ? '1 year' : `${d} days`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Target Margin %</label>
          <input type="number" value={target} onChange={e => setTarget(e.target.value)} min="0" max="100"
            style={{ width: 90, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13 }} />
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!loading && error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 18, color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* ── Summary cards ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <MetricCard label="Revenue" value={fmt(s.revenue)} sub={`${s.trips} trips`} textColor="#1d4ed8" bg="rgba(59,130,246,0.08)" />
            <MetricCard label="Expenses" value={fmt(s.expenses)} sub={`Over ${data.period_days} days`} textColor="#dc2626" bg="rgba(239,68,68,0.08)" />
            <MetricCard label="Profit" value={fmt(s.profit)} sub={`${fmtPct(s.marginPct)} margin`} textColor="#15803d" bg="rgba(22,163,74,0.08)" />
            <MetricCard label="Cost / km" value={fmt(s.fleetCostPerKm)} sub="Fleet average" textColor="#b45309" bg="rgba(245,158,11,0.08)" />
            <MetricCard label="Revenue / km" value={fmt(s.fleetRevPerKm)} sub={`${fmtKm(s.distance)} total`} textColor="#7c3aed" bg="rgba(124,58,237,0.08)" />
          </div>

          {/* ── Recommendations ───────────────────────────────────────────── */}
          <Panel title="Next Steps">
            {data.recommendations.length === 0 ? (
              <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                Not enough trip data yet in this period to generate recommendations.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
                {data.recommendations.map((rec, i) => {
                  const sev = SEVERITY[rec.severity] || SEVERITY.low;
                  return (
                    <div key={i} style={{ background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 10, padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: sev.color, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'white', border: `1px solid ${sev.border}`, borderRadius: 99, padding: '2px 9px' }}>
                          {sev.label}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{rec.area}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 5, lineHeight: 1.5 }}>{rec.message}</div>
                      <div style={{ fontSize: 12.5, color: sev.color, fontWeight: 600, lineHeight: 1.5 }}>→ {rec.action}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* ── Per-truck performance ─────────────────────────────────────── */}
          <Panel title="Truck Performance">
            {data.trucks.length === 0 ? (
              <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-muted)' }}>No trips with a truck assigned in this period.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                      {['Truck', 'Trips', 'Revenue', 'Expenses', 'Profit', 'Margin', 'Cost/km', 'Rev/km'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.trucks.map((t, i) => (
                      <tr key={t.truck} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '9px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.truck}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{t.trips}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-primary)' }}>{fmt(t.revenue)}</td>
                        <td style={{ padding: '9px 14px', color: '#dc2626' }}>{fmt(t.expenses)}</td>
                        <td style={{ padding: '9px 14px', fontWeight: 700, color: t.profit >= 0 ? '#15803d' : '#dc2626' }}>{fmt(t.profit)}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{fmtPct(t.marginPct)}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{fmt(t.costPerKm)}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{fmt(t.revenuePerKm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* ── Per-route performance ─────────────────────────────────────── */}
          <Panel title="Route Performance (estimated cost split evenly by fleet cost/km)">
            {data.routes.length === 0 ? (
              <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-muted)' }}>No trips with both an origin and destination logged in this period.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                      {['Route', 'Trips', 'Revenue', 'Rev/km', 'Est. Profit', 'Est. Margin'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.routes.map((r, i) => (
                      <tr key={r.route + i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '9px 14px', color: 'var(--text-primary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.route}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{r.trips}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-primary)' }}>{fmt(r.revenue)}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{fmt(r.avgRevenuePerKm)}</td>
                        <td style={{ padding: '9px 14px', fontWeight: 700, color: r.estimatedProfit >= 0 ? '#15803d' : '#dc2626' }}>{fmt(r.estimatedProfit)}</td>
                        <td style={{ padding: '9px 14px', fontWeight: 600, color: r.estimatedMarginPct < target ? '#dc2626' : '#15803d' }}>{fmtPct(r.estimatedMarginPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* ── Expense category trend ────────────────────────────────────── */}
          <Panel title="Expense Trend vs. Previous Period">
            {data.categories.length === 0 ? (
              <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-muted)' }}>No expenses logged in this period.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                      {['Category', 'This Period', 'Previous Period', 'Change'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.categories.map((c, i) => (
                      <tr key={c.category} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '9px 14px', color: 'var(--text-primary)' }}>{c.category}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-primary)' }}>{fmt(c.current)}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{fmt(c.prior)}</td>
                        <td style={{ padding: '9px 14px', fontWeight: 700, color: c.pctChange > 15 ? '#dc2626' : c.pctChange < -15 ? '#15803d' : 'var(--text-secondary)' }}>
                          {c.pctChange > 0 ? '+' : ''}{c.pctChange.toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
