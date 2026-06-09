import { useState, useEffect } from 'react';
import { Trash2, Save, Settings2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getAuthHeader } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';
const fmtN = (v) => `₦${Number(v || 0).toLocaleString('en-NG')}`;
const n    = (v) => parseFloat(v) || 0;

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

export default function DieselPriceTab({ showToast }) {
  const [prices,   setPrices]   = useState([]);
  const [settings, setSettings] = useState({ current_depot_price: 0, market_markup: 50 });
  const [form,     setForm]     = useState({ depot_price: '', source: 'Manual', notes: '' });
  const [markup,   setMarkup]   = useState('50');
  const [saving,   setSaving]   = useState(false);
  const [savingMu, setSavingMu] = useState(false);
  const [loading,  setLoading]  = useState(true);

  const load = () =>
    fetch(`${API}/api/aphl/diesel`, { headers: getAuthHeader() })
      .then(r => r.json())
      .then(d => {
        setPrices(Array.isArray(d.prices) ? d.prices : []);
        const s = d.settings || { current_depot_price: 0, market_markup: 50 };
        setSettings(s);
        setMarkup(String(s.market_markup ?? 50));
        setLoading(false);
      })
      .catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const depotPrice = n(settings.current_depot_price);
  const markupN    = n(settings.market_markup);
  const tripPrice  = depotPrice + markupN;

  const lastRec = prices[0]?.recorded_at;
  const daysAgo = lastRec
    ? Math.floor((Date.now() - new Date(lastRec).getTime()) / 86400000)
    : null;
  const lastStr = daysAgo === null ? '—'
    : daysAgo === 0  ? 'Today'
    : `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;

  const handleRecord = async (e) => {
    e.preventDefault();
    if (!form.depot_price) { showToast('Enter the official depot price', 'error'); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/aphl/diesel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      showToast('Depot price recorded', 'success');
      setForm({ depot_price: '', source: 'Manual', notes: '' });
      load();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/api/aphl/diesel/${id}`, { method: 'DELETE', headers: getAuthHeader() });
    showToast('Entry deleted', 'info');
    load();
  };

  const handleSaveMarkup = async () => {
    if (!markup || isNaN(parseFloat(markup))) { showToast('Enter a valid markup amount', 'error'); return; }
    setSavingMu(true);
    try {
      const r = await fetch(`${API}/api/aphl/diesel/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ market_markup: parseFloat(markup) }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      showToast('Markup updated', 'success');
      load();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSavingMu(false); }
  };

  const chartData = prices
    .slice(0, 14)
    .reverse()
    .map(p => ({
      date:  new Date(p.recorded_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' }),
      price: parseFloat(p.depot_price),
    }));

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Top stats row ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>

        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Official Depot Price</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#92400e' }}>
            {fmtN(depotPrice)}<span style={{ fontSize: 14, fontWeight: 600 }}> /L</span>
          </div>
          <div style={{ fontSize: 12, color: '#92400e', opacity: 0.7, marginTop: 4 }}>Current official rate</div>
        </div>

        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Trip Fuel Cost</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>
            {fmtN(tripPrice)}<span style={{ fontSize: 14, fontWeight: 600 }}> /L</span>
          </div>
          <div style={{ fontSize: 12, color: '#dc2626', opacity: 0.7, marginTop: 4 }}>Depot + ₦{markupN.toLocaleString('en-NG')} markup</div>
          <div style={{ fontSize: 11, color: '#dc2626', opacity: 0.55, marginTop: 2, fontStyle: 'italic' }}>Used in Rate Calculator only</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Last Updated</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{lastStr}</div>
          {lastRec && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {new Date(lastRec).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 20, alignItems: 'start' }}>

        {/* LEFT — form + settings */}
        <div>

          {/* Record form */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ background: '#f59e0b', color: 'white', padding: '10px 16px', fontWeight: 700, fontSize: 12, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              Record New Depot Price
            </div>
            <form onSubmit={handleRecord} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Official Depot Price ₦/L *</label>
                <input
                  type="number" value={form.depot_price} min="0"
                  onChange={e => setForm(f => ({ ...f, depot_price: e.target.value }))}
                  placeholder="e.g. 1150" style={inp}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>The official NNPC/depot price for today</div>
              </div>
              <div>
                <label style={lbl}>Source</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={inp}>
                  {['Manual', 'NNPC', 'Depot Slip', 'Market Survey'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Notes (optional)</label>
                <input
                  type="text" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any context about this price" style={inp}
                />
              </div>
              <button type="submit" disabled={saving}
                style={{ padding: '11px 0', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : '⛽ Record Depot Price'}
              </button>
            </form>
          </div>

          {/* Markup settings */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#6b7280', color: 'white', padding: '10px 16px', fontWeight: 700, fontSize: 12, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Settings2 size={13} /> Trip Fuel Settings
            </div>
            <div style={{ padding: 16 }}>
              <label style={lbl}>Trip Fuel Markup ₦/L</label>
              <input type="number" value={markup} min="0" onChange={e => setMarkup(e.target.value)} style={inp} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
                Extra cost per litre when buying fuel outside the depot for trips.<br />
                <strong>Added only in Rate Calculator trip cost calculations.</strong>
              </div>
              <button onClick={handleSaveMarkup} disabled={savingMu}
                style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 0', background: '#6b7280', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: savingMu ? 'not-allowed' : 'pointer', opacity: savingMu ? 0.6 : 1 }}>
                <Save size={13} />{savingMu ? 'Saving…' : 'Save Markup'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — chart + history */}
        <div>

          {chartData.length > 1 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>
                Official Depot Diesel Price — Last 14 Days
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₦${(v / 1000).toFixed(1)}k`} domain={['auto', 'auto']} />
                  <Tooltip formatter={v => [fmtN(v), 'Depot Price']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="price" name="Depot Price"
                    stroke="#f59e0b" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
              Price History
            </div>
            {prices.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                No prices recorded yet. Record today's depot price above.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                      {['Date', 'Depot Price', `Trip Cost (+₦${markupN.toLocaleString('en-NG')})`, 'Source', 'Notes', ''].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((row, i) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {new Date(row.recorded_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </td>
                        <td style={{ padding: '9px 14px', color: '#92400e', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {fmtN(row.depot_price)}/L
                        </td>
                        <td style={{ padding: '9px 14px', color: '#dc2626', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {fmtN(n(row.depot_price) + markupN)}/L
                        </td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.source || '—'}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.notes || '—'}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
