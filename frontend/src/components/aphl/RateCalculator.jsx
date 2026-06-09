import { useState, useEffect, useMemo } from 'react';
import { Printer, Save, Trash2 } from 'lucide-react';
import { getAuthHeader } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

const fmtCur  = (v, dec = 0) => `₦${Number(v || 0).toLocaleString('en-NG', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
const fmtRate = (v) => `₦${Number(v || 0).toFixed(2)}`;
const fmtNum  = (v) => Number(v || 0).toLocaleString('en-NG');
const n       = (v) => parseFloat(v) || 0;

function compute(f) {
  const dl  = n(f.dieselLitres);
  const dp  = n(f.dieselPrice);
  const vol = n(f.volume);
  if (!dl || !dp || !vol) return null;

  const dieselCost = dl * dp;
  const driver     = n(f.driverAllowance);
  const loader     = n(f.loaderFee);
  const tolls      = n(f.tollFees);
  const depot      = n(f.depotCharges);
  const permits    = n(f.nmdpra);
  const security   = n(f.securityEscort);
  const repairs    = n(f.repairsReserve);
  const misc       = n(f.miscellaneous);
  const overhead   = n(f.overhead);
  const tripExp    = driver + loader + tolls + depot + permits + security + repairs + misc;
  const totalCost  = dieselCost + tripExp + overhead;
  const margin     = n(f.targetMargin);
  const breakEven  = totalCost / vol;
  const tgtProfit  = totalCost * (margin / 100);
  const recRate    = (totalCost + tgtProfit) / vol;
  const recRev     = recRate * vol;
  const netProfit  = recRev - totalCost;

  return {
    dieselCost, driver, loader, tolls, depot, permits, security, repairs, misc,
    overhead, tripExp, totalCost, breakEven, margin, tgtProfit, recRate, recRev,
    netProfit, vol, dl, dp, minVol: n(f.minVolume),
  };
}

const BLANK = {
  route: '', product: 'AGO', volume: 33000, truck: 'Truck 1',
  dieselLitres: '', dieselPrice: '',
  driverAllowance: 15000, loaderFee: 5000, tollFees: 8000,
  depotCharges: 0, nmdpra: 0, securityEscort: 0,
  repairsReserve: 5000, miscellaneous: 0,
  minVolume: 3000, targetMargin: 20, overhead: 10000,
};

const inp = {
  width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const lbl = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.07em',
  display: 'block', marginBottom: 5,
};

function SCard({ title, color, children }) {
  return (
    <div style={{ border: `1px solid ${color}33`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ background: color, color: 'white', padding: '10px 16px', fontWeight: 700, fontSize: 12, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {title}
      </div>
      <div style={{ padding: 16, background: 'var(--bg-card)' }}>
        {children}
      </div>
    </div>
  );
}

function RCard({ title, amount, sub, color, bg }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${color}44`, borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{amount}</div>
      {sub && <div style={{ fontSize: 12, color, opacity: 0.8, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function RateCalculator({ showToast }) {
  const [form,    setForm]    = useState(BLANK);
  const [history, setHistory] = useState([]);
  const [saving,  setSaving]  = useState(false);

  const calc  = useMemo(() => compute(form), [form]);
  const show  = calc !== null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const loadHistory = () =>
    fetch(`${API}/api/aphl/calculations`, { headers: getAuthHeader() })
      .then(r => r.json())
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => {});

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    const s = document.createElement('style');
    s.id = 'rcp-styles';
    s.textContent = `
      #rcp-print { display: none; }
      @media print {
        body > * { visibility: hidden; }
        #rcp-print {
          visibility: visible;
          display: block !important;
          position: fixed; inset: 0;
          background: white; color: #111;
          padding: 48px; font-family: Arial, sans-serif;
          z-index: 9999;
        }
        #rcp-print * { visibility: visible; }
      }
    `;
    document.head.appendChild(s);
    return () => { document.getElementById('rcp-styles')?.remove(); };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!show) { showToast('Enter diesel litres and price per litre first', 'error'); return; }
  };

  const handleSave = async () => {
    if (!calc) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/aphl/calculations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          route: form.route || null,
          product: form.product,
          volume_litres: calc.vol,
          truck: form.truck,
          diesel_litres: calc.dl,
          diesel_price: calc.dp,
          diesel_cost: calc.dieselCost,
          total_trip_expenses: calc.tripExp,
          company_overhead: calc.overhead,
          total_cost: calc.totalCost,
          target_margin: calc.margin,
          break_even_rate: calc.breakEven,
          recommended_rate: calc.recRate,
          total_revenue: calc.recRev,
          net_profit: calc.netProfit,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Save failed');
      showToast('Calculation saved', 'success');
      loadHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/api/aphl/calculations/${id}`, { method: 'DELETE', headers: getAuthHeader() });
    showToast('Calculation deleted', 'info');
    loadHistory();
  };

  const handlePrint = () => {
    const el = document.getElementById('rcp-print');
    if (el) el.style.display = 'block';
    window.print();
    window.addEventListener('afterprint', () => {
      if (el) el.style.display = '';
    }, { once: true });
  };

  const tripExpSubtotal = useMemo(() =>
    ['driverAllowance','loaderFee','tollFees','depotCharges','nmdpra','securityEscort','repairsReserve','miscellaneous']
      .reduce((s, k) => s + n(form[k]), 0),
  [form]);

  const volMeetsMin = show ? calc.vol >= calc.minVol : null;
  const today = new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Print-only area ──────────────────────────────────────────────────── */}
      <div id="rcp-print">
        {show && (
          <div>
            <div style={{ borderBottom: '2px solid #333', paddingBottom: 14, marginBottom: 24 }}>
              <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>APHL Africa — Rate Calculation</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
                {form.route || 'Route not specified'} &nbsp;·&nbsp;
                {form.product} &nbsp;·&nbsp;
                {fmtNum(calc.vol)}L &nbsp;·&nbsp;
                {form.truck} &nbsp;·&nbsp;
                {today}
              </p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
              <tbody>
                {[
                  ['Diesel Cost',       fmtCur(calc.dieselCost)],
                  ['Driver Allowance',  fmtCur(calc.driver)],
                  ['Loader/Offloader',  fmtCur(calc.loader)],
                  ['Toll Fees',         fmtCur(calc.tolls)],
                  ['Depot Charges',     fmtCur(calc.depot)],
                  ['NMDPRA/Permits',    fmtCur(calc.permits)],
                  ['Security Escort',   fmtCur(calc.security)],
                  ['Repairs Reserve',   fmtCur(calc.repairs)],
                  ['Miscellaneous',     fmtCur(calc.misc)],
                  ['Company Overhead',  fmtCur(calc.overhead)],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '7px 0', fontSize: 13 }}>{k}</td>
                    <td style={{ padding: '7px 0', fontSize: 13, textAlign: 'right' }}>{v}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '10px 0', fontWeight: 900, borderTop: '2px solid #333' }}>TOTAL TRIP COST</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 900, borderTop: '2px solid #333' }}>{fmtCur(calc.totalCost)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <div style={{ flex: 1, border: '2px solid #f59e0b', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#92400e', marginBottom: 6 }}>Break-Even Rate</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#92400e' }}>{fmtRate(calc.breakEven)} /L</div>
              </div>
              <div style={{ flex: 1, border: '2px solid #16a34a', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#15803d', marginBottom: 6 }}>Recommended Rate</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#15803d' }}>{fmtRate(calc.recRate)} /L</div>
              </div>
            </div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              Net Profit: <strong style={{ color: '#15803d' }}>{fmtCur(calc.netProfit)}</strong>
              &nbsp;·&nbsp; Margin: <strong>{calc.margin}%</strong>
              &nbsp;·&nbsp; Volume: <strong>{fmtNum(calc.vol)}L</strong>
            </div>
            <div style={{ fontSize: 11, color: '#888', borderTop: '1px solid #eee', paddingTop: 12, marginTop: 20 }}>
              Calculated by Business Scout — APHL Africa
            </div>
          </div>
        )}
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'start' }}>

        {/* LEFT — Input form */}
        <form onSubmit={handleSubmit}>

          {/* A — Trip Details */}
          <SCard title="A — Trip Details" color="#f59e0b">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Trip Route (optional)</label>
                <input type="text" value={form.route} onChange={e => set('route', e.target.value)}
                  placeholder="e.g. Abonema Wharf → Warri Depot" style={inp} />
              </div>
              <div>
                <label style={lbl}>Product Being Hauled</label>
                <select value={form.product} onChange={e => set('product', e.target.value)} style={inp}>
                  {['AGO', 'PMS', 'DPK', 'ATK'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Volume to Haul (litres)</label>
                <input type="number" value={form.volume} onChange={e => set('volume', e.target.value)}
                  placeholder="33000" min="1" style={inp} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {[33000, 45000].map(v => (
                    <button key={v} type="button" onClick={() => set('volume', v)}
                      style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${+form.volume === v ? '#f59e0b' : 'var(--border)'}`, background: +form.volume === v ? '#fef3c7' : 'var(--bg-input)', color: +form.volume === v ? '#92400e' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                      {v.toLocaleString('en-NG')}L
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Standard tanker: 33,000L or 45,000L</div>
              </div>
              <div>
                <label style={lbl}>Truck</label>
                <select value={form.truck} onChange={e => set('truck', e.target.value)} style={inp}>
                  {['Truck 1', 'Truck 2', 'Both'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </SCard>

          {/* B — Fuel Costs */}
          <SCard title="B — Fuel Costs" color="#ef4444">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Diesel Used for Trip (litres) *</label>
                <input type="number" value={form.dieselLitres} onChange={e => set('dieselLitres', e.target.value)}
                  placeholder="e.g. 450" min="0" style={inp} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Typical PH–Warri trip: 300–450L</div>
              </div>
              <div>
                <label style={lbl}>Price per Litre of Diesel ₦ *</label>
                <input type="number" value={form.dieselPrice} onChange={e => set('dieselPrice', e.target.value)}
                  placeholder="e.g. 1150" min="0" style={inp} />
              </div>
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Diesel Cost</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>
                  {form.dieselLitres && form.dieselPrice ? fmtCur(n(form.dieselLitres) * n(form.dieselPrice)) : '—'}
                </span>
              </div>
            </div>
          </SCard>

          {/* C — Trip Expenses */}
          <SCard title="C — Trip Expenses" color="#3b82f6">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'driverAllowance', label: 'Driver Allowance ₦'          },
                { key: 'loaderFee',       label: 'Loader/Offloader Fee ₦'      },
                { key: 'tollFees',        label: 'Toll Fees ₦'                 },
                { key: 'depotCharges',    label: 'Depot Loading Charges ₦'     },
                { key: 'nmdpra',          label: 'NMDPRA / Permit Costs ₦'     },
                { key: 'securityEscort',  label: 'Police/Security Escort ₦'    },
                { key: 'repairsReserve',  label: 'Repairs/Breakdown Reserve ₦' },
                { key: 'miscellaneous',   label: 'Miscellaneous ₦'             },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input type="number" value={form[key]} onChange={e => set(key, e.target.value)} min="0" style={inp} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
              Recommended Repairs Reserve: ₦5,000–₦10,000 per trip
            </div>
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 8, padding: '10px 14px', marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Trip Expenses</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#1d4ed8' }}>{fmtCur(tripExpSubtotal)}</span>
            </div>
          </SCard>

          {/* D — Business Targets */}
          <SCard title="D — Business Targets" color="#16a34a">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Minimum Volume Threshold (litres)</label>
                <input type="number" value={form.minVolume} onChange={e => set('minVolume', e.target.value)} min="0" style={inp} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Minimum load to accept this trip</div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Target Profit Margin</label>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#16a34a' }}>{form.targetMargin}%</span>
                </div>
                <input type="range" min={5} max={50} step={1} value={form.targetMargin}
                  onChange={e => set('targetMargin', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#16a34a', cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  <span>5%</span><span>50%</span>
                </div>
                {show && (
                  <div style={{ fontSize: 12, color: '#16a34a', marginTop: 6, fontWeight: 600 }}>
                    Target profit: {fmtCur(calc.tgtProfit)}
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Company Overhead per Trip ₦</label>
                <input type="number" value={form.overhead} onChange={e => set('overhead', e.target.value)} min="0" style={inp} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Admin, insurance, office costs per trip</div>
              </div>
            </div>
          </SCard>

          <button type="submit"
            style={{ width: '100%', padding: '14px 24px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.02em', boxShadow: '0 4px 12px rgba(245,158,11,0.3)', transition: 'background 0.15s' }}
            onMouseOver={e => { e.currentTarget.style.background = '#d97706'; }}
            onMouseOut={e =>  { e.currentTarget.style.background = '#f59e0b'; }}>
            🧮 Calculate Rate
          </button>
        </form>

        {/* RIGHT — Results */}
        <div>

          {/* Card 1 — Cost Breakdown */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
              Trip Cost Breakdown
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  ['Diesel Cost',       show ? fmtCur(calc.dieselCost) : '—'],
                  ['Driver Allowance',  show ? fmtCur(calc.driver)     : '—'],
                  ['Loader/Offloader',  show ? fmtCur(calc.loader)     : '—'],
                  ['Toll Fees',         show ? fmtCur(calc.tolls)      : '—'],
                  ['Depot Charges',     show ? fmtCur(calc.depot)      : '—'],
                  ['NMDPRA/Permits',    show ? fmtCur(calc.permits)    : '—'],
                  ['Security Escort',   show ? fmtCur(calc.security)   : '—'],
                  ['Repairs Reserve',   show ? fmtCur(calc.repairs)    : '—'],
                  ['Miscellaneous',     show ? fmtCur(calc.misc)       : '—'],
                  ['Company Overhead',  show ? fmtCur(calc.overhead)   : '—'],
                ].map(([k, v], i) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '9px 18px', color: 'var(--text-secondary)' }}>{k}</td>
                    <td style={{ padding: '9px 18px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>{v}</td>
                  </tr>
                ))}
                <tr style={{ background: 'rgba(239,68,68,0.04)' }}>
                  <td style={{ padding: '11px 18px', fontWeight: 800, color: '#dc2626', borderTop: '2px solid rgba(239,68,68,0.18)' }}>
                    TOTAL TRIP COST
                  </td>
                  <td style={{ padding: '11px 18px', textAlign: 'right', fontWeight: 900, color: '#dc2626', fontSize: 15, borderTop: '2px solid rgba(239,68,68,0.18)' }}>
                    {show ? fmtCur(calc.totalCost) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Card 2 — Rate Analysis */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 14 }}>Rate Analysis</div>
            <RCard
              title="Break-Even Rate"
              amount={show ? `${fmtRate(calc.breakEven)} per litre` : '—'}
              sub="Minimum to cover all costs"
              color="#92400e" bg="rgba(245,158,11,0.08)"
            />
            <RCard
              title="Recommended Rate"
              amount={show ? `${fmtRate(calc.recRate)} per litre` : '—'}
              sub={show ? `Includes ${calc.margin}% profit margin` : 'Includes target profit margin'}
              color="#15803d" bg="rgba(22,163,74,0.08)"
            />
            <RCard
              title="Total Trip Revenue (at recommended)"
              amount={show ? fmtCur(calc.recRev) : '—'}
              sub={show ? `For ${fmtNum(calc.vol)} litres hauled` : '—'}
              color="#1d4ed8" bg="rgba(59,130,246,0.08)"
            />
          </div>

          {/* Card 3 — Profit Summary */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>Profit Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'rgba(107,114,128,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>At Break-Even</div>
                {[
                  ['Revenue',    show ? fmtCur(calc.breakEven * calc.vol) : '—', '#1d4ed8'],
                  ['Costs',      show ? fmtCur(calc.totalCost)            : '—', '#dc2626'],
                  ['Net Profit', '₦0',                                            '#6b7280'],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(22,163,74,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>At Recommended</div>
                {[
                  ['Revenue',    show ? fmtCur(calc.recRev)     : '—', '#1d4ed8'],
                  ['Costs',      show ? fmtCur(calc.totalCost)  : '—', '#dc2626'],
                  ['Net Profit', show ? fmtCur(calc.netProfit)  : '—', '#15803d'],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{v}</span>
                  </div>
                ))}
                {show && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(22,163,74,0.2)', paddingTop: 5, marginTop: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Margin</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>{calc.margin}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 4 — Volume Viability */}
          <div style={{ background: 'var(--bg-card)', border: `1px solid ${show ? (volMeetsMin ? 'rgba(22,163,74,0.35)' : 'rgba(239,68,68,0.35)') : 'var(--border)'}`, borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>Volume Viability</div>
            {!show ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Fill required fields to see viability check.</div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{volMeetsMin ? '✅' : '❌'}</span>
                  <div style={{ fontSize: 13, color: volMeetsMin ? '#15803d' : '#dc2626', fontWeight: 600, lineHeight: 1.5 }}>
                    {volMeetsMin
                      ? `Volume of ${fmtNum(calc.vol)} L meets minimum threshold of ${fmtNum(calc.minVol)} L`
                      : `Volume of ${fmtNum(calc.vol)} L is BELOW minimum threshold of ${fmtNum(calc.minVol)} L — consider rejecting this trip`
                    }
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Cost per litre at break-even: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{fmtRate(calc.breakEven)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {show && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, flex: 1, padding: '11px 0', background: '#16a34a', color: 'white', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                <Save size={15} />{saving ? 'Saving…' : 'Save Calculation'}
              </button>
              <button onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, flex: 1, padding: '11px 0', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'opacity 0.15s' }}>
                <Printer size={15} />Print / Export PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Calculations ──────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
            Recent Calculations
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Route', 'Volume', 'Break-Even', 'Rec. Rate', 'Net Profit', ''].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 5).map((row, i) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {row.calculated_at ? new Date(row.calculated_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.route || '—'}
                    </td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {fmtNum(row.volume_litres)}L
                    </td>
                    <td style={{ padding: '9px 14px', color: '#92400e', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {fmtRate(row.break_even_rate)}/L
                    </td>
                    <td style={{ padding: '9px 14px', color: '#15803d', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {fmtRate(row.recommended_rate)}/L
                    </td>
                    <td style={{ padding: '9px 14px', fontWeight: 700, whiteSpace: 'nowrap', color: parseFloat(row.net_profit) >= 0 ? '#15803d' : '#dc2626' }}>
                      {fmtCur(row.net_profit)}
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      <button onClick={() => handleDelete(row.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '3px 6px', borderRadius: 6 }}
                        title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
