import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Pencil, Trash2, Download, Search } from 'lucide-react';
import { getAuthHeader } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

const today = () => new Date().toISOString().split('T')[0];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const fmt  = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const fmtV = (n) => `${Number(n || 0).toLocaleString('en-NG')} L`;

const DEPOTS   = ['Abonema Wharf', 'Total Energies', 'NIPCO Eleme', 'NNPC Depot', 'Ardova'];
const PRODUCTS = ['AGO', 'PMS', 'DPK', 'ATK'];
const TRUCKS   = ['Truck 1', 'Truck 2'];
const STATUSES = ['Paid', 'Pending', 'Part Payment'];

const STATUS_STYLE = {
  Paid:           { bg: '#dcfce7', text: '#15803d' },
  Pending:        { bg: '#fef3c7', text: '#92400e' },
  'Part Payment': { bg: '#dbeafe', text: '#1d4ed8' },
};

const BLANK = { date: today(), customer_name: '', depot_name: '', product: 'AGO', volume_litres: '', rate_per_litre: '', truck: 'Truck 1', driver: '', payment_status: 'Pending', waybill_number: '', notes: '' };

function StatCard({ label, value, icon, color, bg }) {
  return (
    <div style={{ flex: '1 1 140px', background: bg, borderRadius: 12, padding: '16px 18px', border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{icon} {label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

export default function SalesTab({ showToast }) {
  const [sales,     setSales]     = useState([]);
  const [formOpen,  setFormOpen]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(BLANK);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState('');
  const [fProduct,  setFProduct]  = useState('all');
  const [fTruck,    setFTruck]    = useState('all');
  const [fStatus,   setFStatus]   = useState('all');

  const load = () =>
    fetch(`${API}/api/aphl/sales`, { headers: getAuthHeader() })
      .then(r => r.json()).then(setSales).catch(() => {});

  useEffect(() => { load(); }, []);

  const totalAmount = (parseFloat(form.volume_litres) || 0) * (parseFloat(form.rate_per_litre) || 0);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm(BLANK); setEditId(null); setFormOpen(true); };
  const openEdit = (s) => {
    setForm({
      date: s.date?.slice(0,10) ?? today(), customer_name: s.customer_name, depot_name: s.depot_name,
      product: s.product, volume_litres: s.volume_litres, rate_per_litre: s.rate_per_litre,
      truck: s.truck || 'Truck 1', driver: s.driver || '', payment_status: s.payment_status,
      waybill_number: s.waybill_number || '', notes: s.notes || '',
    });
    setEditId(s.id); setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.depot_name || !form.volume_litres || !form.rate_per_litre) {
      showToast('Please fill all required fields', 'error'); return;
    }
    setSaving(true);
    try {
      const url    = editId ? `${API}/api/aphl/sales/${editId}` : `${API}/api/aphl/sales`;
      const method = editId ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast(editId ? 'Sale updated' : 'Sale logged', 'success');
      setFormOpen(false); setEditId(null); setForm(BLANK); load();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this sale record?')) return;
    await fetch(`${API}/api/aphl/sales/${id}`, { method: 'DELETE', headers: getAuthHeader() });
    showToast('Sale deleted', 'info'); load();
  };

  // Stats from current data
  const now = thisMonth();
  const monthSales = useMemo(() => sales.filter(s => s.date?.slice(0,7) === now), [sales, now]);
  const stats = useMemo(() => ({
    count:   monthSales.length,
    revenue: monthSales.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0),
    litres:  monthSales.reduce((s, r) => s + parseFloat(r.volume_litres || 0), 0),
    pending: monthSales.filter(r => r.payment_status === 'Pending').length,
  }), [monthSales]);

  const filtered = useMemo(() => {
    let list = [...sales];
    if (fProduct !== 'all') list = list.filter(s => s.product === fProduct);
    if (fTruck   !== 'all') list = list.filter(s => s.truck   === fTruck);
    if (fStatus  !== 'all') list = list.filter(s => s.payment_status === fStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.customer_name?.toLowerCase().includes(q) || s.depot_name?.toLowerCase().includes(q) || s.driver?.toLowerCase().includes(q));
    }
    return list;
  }, [sales, fProduct, fTruck, fStatus, search]);

  const inputCls = { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelCls = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard label="Sales This Month" value={stats.count}        icon="📋" color="#15803d" bg="rgba(66,214,116,0.08)"  />
        <StatCard label="Revenue"          value={fmt(stats.revenue)} icon="💰" color="#15803d" bg="rgba(66,214,116,0.08)"  />
        <StatCard label="Litres Moved"     value={fmtV(stats.litres)} icon="🛢" color="#1d4ed8" bg="rgba(37,99,235,0.06)"   />
        <StatCard label="Pending Payments" value={stats.pending}      icon="⏳" color="#92400e" bg="rgba(245,158,11,0.08)"  />
      </div>

      {/* Add form toggle */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <button
          onClick={() => { setFormOpen(o => !o); setEditId(null); setForm(BLANK); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}
        >
          {formOpen && !editId ? <X size={16} /> : <Plus size={16} color="#42D674" />}
          {formOpen && !editId ? 'Cancel' : 'Log New Sale'}
        </button>

        {formOpen && (
          <form onSubmit={handleSubmit} style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, paddingTop: 16 }}>

              <div><label style={labelCls}>Date *</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required style={inputCls} /></div>

              <div><label style={labelCls}>Customer Name *</label>
                <input type="text" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Customer..." required style={inputCls} /></div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelCls}>Depot *</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {DEPOTS.map(d => (
                    <button key={d} type="button" onClick={() => set('depot_name', d)}
                      style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: form.depot_name === d ? '#42D674' : 'var(--bg-input)', color: form.depot_name === d ? '#060e08' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                      {d}
                    </button>
                  ))}
                </div>
                <input type="text" value={form.depot_name} onChange={e => set('depot_name', e.target.value)} placeholder="Or type depot name..." required style={inputCls} />
              </div>

              <div><label style={labelCls}>Product *</label>
                <select value={form.product} onChange={e => set('product', e.target.value)} style={inputCls}>
                  {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                </select></div>

              <div><label style={labelCls}>Volume (Litres) *</label>
                <input type="number" value={form.volume_litres} onChange={e => set('volume_litres', e.target.value)} placeholder="0" min="0" required style={inputCls} /></div>

              <div><label style={labelCls}>Rate / Litre (₦) *</label>
                <input type="number" value={form.rate_per_litre} onChange={e => set('rate_per_litre', e.target.value)} placeholder="0" min="0" required style={inputCls} /></div>

              <div><label style={labelCls}>Total Amount</label>
                <div style={{ ...inputCls, color: '#15803d', fontWeight: 700, fontSize: 16, cursor: 'default' }}>{fmt(totalAmount)}</div></div>

              <div><label style={labelCls}>Truck</label>
                <select value={form.truck} onChange={e => set('truck', e.target.value)} style={inputCls}>
                  {TRUCKS.map(t => <option key={t}>{t}</option>)}
                </select></div>

              <div><label style={labelCls}>Driver</label>
                <input type="text" value={form.driver} onChange={e => set('driver', e.target.value)} placeholder="Driver name" style={inputCls} /></div>

              <div><label style={labelCls}>Waybill Number</label>
                <input type="text" value={form.waybill_number} onChange={e => set('waybill_number', e.target.value)} placeholder="WB-001" style={inputCls} /></div>

              <div><label style={labelCls}>Payment Status</label>
                <select value={form.payment_status} onChange={e => set('payment_status', e.target.value)} style={inputCls}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select></div>

              <div style={{ gridColumn: 'span 2' }}><label style={labelCls}>Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." rows={2} style={{ ...inputCls, resize: 'vertical' }} /></div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button type="submit" disabled={saving}
                style={{ background: '#42D674', color: '#060e08', border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : editId ? '💾 Update Sale' : '✅ Log Sale'}
              </button>
              <button type="button" onClick={() => { setFormOpen(false); setEditId(null); setForm(BLANK); }}
                style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 20px', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filter bar */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, depot, driver…"
            style={{ width: '100%', paddingLeft: 32, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 32px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {[
          { label: 'Product', val: fProduct, set: setFProduct, opts: ['all', ...PRODUCTS] },
          { label: 'Truck',   val: fTruck,   set: setFTruck,   opts: ['all', ...TRUCKS]   },
          { label: 'Status',  val: fStatus,  set: setFStatus,  opts: ['all', ...STATUSES] },
        ].map(f => (
          <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
            <option value="all">All {f.label}s</option>
            {f.opts.filter(o => o !== 'all').map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No sales records found. Log your first sale above.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                  {['Date','Customer','Depot','Product','Volume','Rate','Amount','Truck','Driver','Status','Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const sc = STATUS_STYLE[s.payment_status] ?? STATUS_STYLE.Pending;
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{s.date?.slice(0,10)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.customer_name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{s.depot_name}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ background: 'rgba(66,214,116,0.12)', color: '#15803d', fontWeight: 700, padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>{s.product}</span></td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{Number(s.volume_litres).toLocaleString()}L</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{fmt(s.rate_per_litre)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>{fmt(s.total_amount)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{s.truck || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{s.driver || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: sc.bg, color: sc.text, fontWeight: 600, padding: '3px 10px', borderRadius: 99, fontSize: 11, whiteSpace: 'nowrap' }}>{s.payment_status}</span>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEdit(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '4px 6px', borderRadius: 6 }} title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px 6px', borderRadius: 6 }} title="Delete"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
