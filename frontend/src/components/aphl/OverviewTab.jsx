import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getAuthHeader } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

const fmt  = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const fmtL = (n) => `${Number(n || 0).toLocaleString('en-NG')}L`;

const PIE_COLORS = ['#f59e0b','#3b82f6','#8b5cf6','#ef4444','#6b7280','#f97316','#14b8a6','#9ca3af'];

const STATUS_COLORS = {
  Paid:          { bg: '#dcfce7', text: '#15803d' },
  Pending:       { bg: '#fef3c7', text: '#92400e' },
  'Part Payment':{ bg: '#dbeafe', text: '#1d4ed8' },
};

const CAT_COLORS = {
  'Diesel':           '#f59e0b',
  'Truck Maintenance':'#3b82f6',
  'Driver Wages':     '#8b5cf6',
  'NMDPRA / Permits': '#ef4444',
  'Toll Fees':        '#6b7280',
  'Depot Charges':    '#f97316',
  'Office Expenses':  '#14b8a6',
  'Miscellaneous':    '#9ca3af',
};

function MetricCard({ label, value, sub, bg, textColor, icon }) {
  return (
    <div style={{ flex: '1 1 180px', background: bg, borderRadius: 14, padding: '20px 22px', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: textColor, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: textColor, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: textColor, opacity: 0.6, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, onViewAll }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
      {onViewAll && (
        <button onClick={onViewAll} style={{ fontSize: 12, color: '#42D674', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          View all →
        </button>
      )}
    </div>
  );
}

export default function OverviewTab({ onNavigate }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [diesel,  setDiesel]  = useState(null);

  useEffect(() => {
    fetch(`${API}/api/aphl/overview`, { headers: getAuthHeader() })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`${API}/api/aphl/diesel`, { headers: getAuthHeader() })
      .then(r => r.json())
      .then(d => setDiesel(d))
      .catch(() => {});
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #42D674', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  const revenue      = data?.revenue?.thisMonth ?? 0;
  const directSales  = data?.revenue?.directSalesThisMonth ?? 0;
  const leaseRev     = data?.revenue?.leasesThisMonth ?? 0;
  const expenses     = data?.expenses?.thisMonth ?? 0;
  const profit       = data?.profit?.thisMonth ?? 0;
  const trips        = data?.trips?.thisMonth ?? 0;
  const dist         = data?.distribution ?? {};
  const chart        = data?.monthlyChart ?? [];
  const pie          = (data?.expenses?.byCategory ?? []).map((c, i) => ({
    name: c.category, value: c.total, color: CAT_COLORS[c.category] || PIE_COLORS[i % PIE_COLORS.length],
  }));
  const trucks       = data?.trucks ?? {};

  const directPct = revenue > 0 ? Math.round((directSales / revenue) * 100) : 0;
  const leasePct  = revenue > 0 ? Math.round((leaseRev   / revenue) * 100) : 0;

  const cardBg = 'var(--bg-card)';
  const border  = '1px solid var(--border)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Row 1: Metric cards ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <MetricCard label="Total Revenue"    value={fmt(revenue)}    icon="💰" bg="rgba(66,214,116,0.1)"  textColor="#15803d"  sub={`${trips} trips this month`} />
        <MetricCard label="Direct Sales"     value={fmt(directSales)} icon="🛢" bg="rgba(66,214,116,0.07)" textColor="#15803d"  sub={`${directPct}% of revenue`} />
        <MetricCard label="Truck Lease Rev." value={fmt(leaseRev)}    icon="🚛" bg="rgba(37,99,235,0.08)"  textColor="#1d4ed8"  sub={`${leasePct}% of revenue`} />
        <MetricCard label="Total Expenses"   value={fmt(expenses)}    icon="📤" bg="rgba(239,68,68,0.1)"   textColor="#dc2626"  sub="This month" />
        <MetricCard label="Net Profit"       value={fmt(profit)}      icon="📈" bg="rgba(139,92,246,0.08)" textColor="#7c3aed"  sub={revenue > 0 ? `${((profit/revenue)*100).toFixed(1)}% margin` : '—'} />
      </div>

      {/* ── Revenue Sources bar ──────────────────────────────────────────── */}
      <div style={{ background: cardBg, border, borderRadius: 14, padding: 20 }}>
        <SectionHeader title="Revenue Sources — This Month" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Direct Sales',  val: directSales, pct: directPct, color: '#42D674', bg: 'rgba(66,214,116,0.12)'  },
            { label: 'Truck Leases',  val: leaseRev,    pct: leasePct,  color: '#3b82f6', bg: 'rgba(59,130,246,0.10)'  },
          ].map(s => (
            <div key={s.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{fmt(s.val)}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{s.pct}%</span>
                </div>
              </div>
              <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
          {/* combined visual bar */}
          <div style={{ height: 10, borderRadius: 99, overflow: 'hidden', display: 'flex', marginTop: 4 }}>
            <div style={{ width: `${directPct}%`, background: '#42D674', transition: 'width 0.6s ease' }} />
            <div style={{ flex: 1, background: '#3b82f6' }} />
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>🟢 {directPct}% Direct Sales</span>
            <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>🔵 {leasePct}% Truck Leases</span>
          </div>
        </div>
      </div>

      {/* ── Row 2: Recent Sales + Recent Expenses ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Recent Sales */}
        <div style={{ background: cardBg, border, borderRadius: 14, padding: 20 }}>
          <SectionHeader title="Recent Sales" onViewAll={() => onNavigate('sales')} />
          {(data?.recentSales ?? []).length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No sales logged yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.recentSales ?? []).map(s => {
                const sc = STATUS_COLORS[s.payment_status] ?? STATUS_COLORS.Pending;
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.customer_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {s.transaction_type === 'truck_lease'
                          ? `🚛 ${s.origin || '?'} → ${s.destination || '?'}`
                          : `🛢 ${s.depot_name || ''} · ${s.product || ''} · ${Number(s.volume_litres || 0).toLocaleString()}L`
                        }
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{fmt(s.total_amount)}</div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.text }}>{s.payment_status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div style={{ background: cardBg, border, borderRadius: 14, padding: 20 }}>
          <SectionHeader title="Recent Expenses" onViewAll={() => onNavigate('expenses')} />
          {(data?.recentExpenses ?? []).length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No expenses logged yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.recentExpenses ?? []).map(e => {
                const cc = CAT_COLORS[e.category] || '#6b7280';
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{e.description}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        <span style={{ color: cc, fontWeight: 600 }}>{e.category}</span>
                        {e.vendor ? ` · ${e.vendor}` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{fmt(e.amount)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Revenue Distribution ─────────────────────────────────── */}
      <div style={{ background: cardBg, border, borderRadius: 14, padding: 20 }}>
        <SectionHeader title="Revenue Distribution" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Operations',   pct: 25, val: dist.operations,   color: '#3b82f6', bg: 'rgba(59,130,246,0.08)'  },
            { label: 'Maintenance',  pct: 10, val: dist.maintenance,  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)'  },
            { label: 'Savings',      pct: 10, val: dist.savings,      color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)'  },
            { label: 'Reinvestment', pct: 55, val: dist.reinvestment, color: '#42D674', bg: 'rgba(66,214,116,0.08)'  },
          ].map(d => (
            <div key={d.label} style={{ background: d.bg, borderRadius: 10, padding: '16px 14px', border: `1px solid ${d.color}33` }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: d.color }}>{d.pct}%</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: d.color, marginBottom: 4 }}>{d.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: d.color, opacity: 0.8 }}>{fmt(d.val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 4: Charts ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>

        {/* Bar Chart */}
        <div style={{ background: cardBg, border, borderRadius: 14, padding: 20 }}>
          <SectionHeader title="Monthly Revenue vs Expenses" />
          {chart.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="revenue"  name="Revenue"  fill="#42D674" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div style={{ background: cardBg, border, borderRadius: 14, padding: 20 }}>
          <SectionHeader title="Expense Breakdown" />
          {pie.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No expenses yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 5: Truck performance ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {['Truck 1', 'Truck 2'].map(truck => {
          const t = trucks[truck];
          return (
            <div key={truck} style={{ background: cardBg, border, borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>🚛</span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{truck}</h3>
                {t && <span style={{ fontSize: 11, fontWeight: 600, color: '#42D674', background: 'rgba(66,214,116,0.1)', padding: '2px 10px', borderRadius: 99 }}>Active</span>}
              </div>
              {!t ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No trips this month</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Trips',           val: t.trips,                  icon: '📊' },
                    { label: 'Litres Moved',    val: fmtL(t.litres),           icon: '🛢' },
                    { label: 'Revenue',         val: fmt(t.revenue),           icon: '💵' },
                    { label: 'Last Trip',       val: t.lastTrip ? new Date(t.lastTrip).toLocaleDateString('en-NG',{day:'2-digit',month:'short'}) : '—', icon: '📅' },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{stat.icon} {stat.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Row 6: Diesel Prices ─────────────────────────────────────────── */}
      {diesel && (
        <div style={{ background: cardBg, border, borderRadius: 14, padding: 20 }}>
          <SectionHeader title="Diesel Prices" onViewAll={() => onNavigate('diesel')} />
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: '1 1 160px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Official Depot Price</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#92400e' }}>
                {`₦${Number(diesel.settings?.current_depot_price || 0).toLocaleString('en-NG')}`}<span style={{ fontSize: 12 }}>/L</span>
              </div>
            </div>
            <div style={{ flex: '1 1 160px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Trip Fuel Cost</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>
                {`₦${(Number(diesel.settings?.current_depot_price || 0) + Number(diesel.settings?.market_markup || 50)).toLocaleString('en-NG')}`}<span style={{ fontSize: 12 }}>/L</span>
              </div>
              <div style={{ fontSize: 10, color: '#dc2626', opacity: 0.65, marginTop: 3 }}>Depot + ₦{Number(diesel.settings?.market_markup || 50).toLocaleString('en-NG')} markup</div>
            </div>
            {diesel.prices?.[0] && (
              <div style={{ flex: '1 1 160px', background: 'var(--bg-input)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Last Updated</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {new Date(diesel.prices[0].recorded_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            )}
          </div>
          {(diesel.prices?.length ?? 0) > 1 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Official Depot Diesel Price — Last 14 Days
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart
                  data={[...diesel.prices].slice(0, 14).reverse().map(p => ({
                    date:  new Date(p.recorded_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' }),
                    price: parseFloat(p.depot_price),
                  }))}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₦${(v / 1000).toFixed(1)}k`} domain={['auto', 'auto']} />
                  <Tooltip formatter={v => [`₦${Number(v).toLocaleString('en-NG')}`, 'Depot Price']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}

    </div>
  );
}
