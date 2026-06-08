import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Pencil, Trash2, Search } from 'lucide-react';
import { getAuthHeader } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

const today     = () => new Date().toISOString().split('T')[0];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const fmt  = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const fmtV = (n) => `${Number(n || 0).toLocaleString('en-NG')} L`;

const DEPOTS   = ['Abonema Wharf', 'Total Energies', 'NIPCO Eleme', 'NNPC Depot', 'Ardova'];
const PRODUCTS = ['AGO', 'PMS', 'DPK', 'ATK'];
const PRODUCTS_ALL = ['AGO', 'PMS', 'DPK', 'ATK', 'Other'];
const TRUCKS   = ['Truck 1', 'Truck 2'];
const STATUSES = ['Paid', 'Pending', 'Part Payment'];

const STATUS_STYLE = {
  Paid:           { bg: '#dcfce7', text: '#15803d' },
  Pending:        { bg: '#fef3c7', text: '#92400e' },
  'Part Payment': { bg: '#dbeafe', text: '#1d4ed8' },
};

const TYPE_STYLE = {
  direct_sale: { label: 'Direct Sale', icon: '🛢', bg: 'rgba(66,214,116,0.12)', text: '#15803d', border: 'rgba(66,214,116,0.3)' },
  truck_lease:  { label: 'Truck Lease', icon: '🚛', bg: 'rgba(37,99,235,0.10)',  text: '#1d4ed8', border: 'rgba(37,99,235,0.3)'  },
};

const BLANK_DIRECT = {
  transaction_type: 'direct_sale',
  date: today(), customer_name: '', customer_phone: '',
  depot_name: '', product: 'AGO', volume_litres: '', rate_per_litre: '',
  truck: 'Truck 1', driver: '', payment_status: 'Pending', waybill_number: '', notes: '',
};

const BLANK_LEASE = {
  transaction_type: 'truck_lease',
  date: today(), customer_name: '', customer_phone: '', customer_address: '',
  origin: '', destination: '', product_type: 'AGO', lease_volume_litres: '',
  haulage_rate: '',
  truck: 'Truck 1', driver: '', payment_status: 'Pending', waybill_number: '', notes: '',
};

function StatCard({ label, value, sub, icon, color, bg }) {
  return (
    <div style={{ flex: '1 1 160px', background: bg, borderRadius: 12, padding: '16px 18px', border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{icon} {label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color, opacity: 0.6, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function SalesTab({ showToast }) {
  const [sales,    setSales]    = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [txType,   setTxType]   = useState('direct_sale');
  const [form,     setForm]     = useState(BLANK_DIRECT);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [fType,    setFType]    = useState('all');
  const [fTruck,   setFTruck]   = useState('all');
  const [fStatus,  setFStatus]  = useState('all');

  const load = () =>
    fetch(`${API}/api/aphl/sales`, { headers: getAuthHeader() })
      .then(r => r.json()).then(setSales).catch(() => {});

  useEffect(() => { load(); }, []);

  const totalAmount = txType === 'truck_lease'
    ? (parseFloat(form.haulage_rate)  || 0)
    : (parseFloat(form.volume_litres) || 0) * (parseFloat(form.rate_per_litre) || 0);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const switchType = (t) => {
    setTxType(t);
    setForm(t === 'truck_lease' ? BLANK_LEASE : BLANK_DIRECT);
  };

  const openAdd = () => {
    setTxType('direct_sale');
    setForm(BLANK_DIRECT);
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (s) => {
    const t = s.transaction_type || 'direct_sale';
    setTxType(t);
    setForm({
      transaction_type:    t,
      date:                s.date?.slice(0, 10) ?? today(),
      customer_name:       s.customer_name       ?? '',
      customer_phone:      s.customer_phone       ?? '',
      customer_address:    s.customer_address     ?? '',
      depot_name:          s.depot_name           ?? '',
      product:             s.product              ?? 'AGO',
      volume_litres:       s.volume_litres        ?? '',
      rate_per_litre:      s.rate_per_litre       ?? '',
      origin:              s.origin               ?? '',
      destination:         s.destination          ?? '',
      product_type:        s.product_type         ?? 'AGO',
      lease_volume_litres: s.lease_volume_litres  ?? '',
      haulage_rate:        s.haulage_rate         ?? '',
      truck:               s.truck                ?? 'Truck 1',
      driver:              s.driver               ?? '',
      payment_status:      s.payment_status       ?? 'Pending',
      waybill_number:      s.waybill_number       ?? '',
      notes:               s.notes                ?? '',
    });
    setEditId(s.id);
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name) { showToast('Customer name is required', 'error'); return; }
    if (txType === 'direct_sale' && (!form.volume_litres || !form.rate_per_litre)) {
      showToast('Volume and rate are required for direct sales', 'error'); return;
    }
    if (txType === 'truck_lease' && (!form.origin || !form.destination || !form.haulage_rate)) {
      showToast('Origin, destination, and haulage rate are required', 'error'); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, transaction_type: txType };
      const url     = editId ? `${API}/api/aphl/sales/${editId}` : `${API}/api/aphl/sales`;
      const method  = editId ? 'PUT' : 'POST';
      const res     = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast(editId ? 'Sale updated' : 'Sale logged', 'success');
      setFormOpen(false); setEditId(null); setForm(BLANK_DIRECT); load();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await fetch(`${API}/api/aphl/sales/${id}`, { method: 'DELETE', headers: getAuthHeader() });
    showToast('Deleted', 'info'); load();
  };

  const now = thisMonth();
  const monthSales = useMemo(() => sales.filter(s => s.date?.slice(0, 7) === now), [sales, now]);
  const stats = useMemo(() => {
    const direct  = monthSales.filter(s => (s.transaction_type || 'direct_sale') === 'direct_sale');
    const leases  = monthSales.filter(s => s.transaction_type === 'truck_lease');
    const pending = monthSales.filter(s => s.payment_status === 'Pending');
    return {
      total:         monthSales.reduce((a, s) => a + parseFloat(s.total_amount || 0), 0),
      directCount:   direct.length,
      directAmount:  direct.reduce((a, s) => a + parseFloat(s.total_amount || 0), 0),
      leaseCount:    leases.length,
      leaseAmount:   leases.reduce((a, s) => a + parseFloat(s.total_amount || 0), 0),
      pendingCount:  pending.length,
      pendingAmount: pending.reduce((a, s) => a + parseFloat(s.total_amount || 0), 0),
    };
  }, [monthSales]);

  const filtered = useMemo(() => {
    let list = [...sales];
    if (fType   !== 'all') list = list.filter(s => (s.transaction_type || 'direct_sale') === fType);
    if (fTruck  !== 'all') list = list.filter(s => s.truck === fTruck);
    if (fStatus !== 'all') list = list.filter(s => s.payment_status === fStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.customer_name?.toLowerCase().includes(q) ||
        s.depot_name?.toLowerCase().includes(q)    ||
        s.origin?.toLowerCase().includes(q)        ||
        s.destination?.toLowerCase().includes(q)   ||
        s.driver?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sales, fType, fTruck, fStatus, search]);

  const inp  = { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const lbl  = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 };
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard label="Total Revenue"   value={fmt(stats.total)}        icon="💰" color="#15803d" bg="rgba(66,214,116,0.08)"  sub="This month (all types)" />
        <StatCard label="Direct Sales"    value={fmt(stats.directAmount)}  icon="🛢" color="#15803d" bg="rgba(66,214,116,0.08)"  sub={`${stats.directCount} sale${stats.directCount !== 1 ? 's' : ''}`} />
        <StatCard label="Truck Leases"    value={fmt(stats.leaseAmount)}   icon="🚛" color="#1d4ed8" bg="rgba(37,99,235,0.06)"   sub={`${stats.leaseCount} trip${stats.leaseCount !== 1 ? 's' : ''}`} />
        <StatCard label="Pending"         value={fmt(stats.pendingAmount)} icon="⏳" color="#92400e" bg="rgba(245,158,11,0.08)"  sub={`${stats.pendingCount} unpaid`} />
      </div>

      {/* ── Add / Edit form ──────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <button
          onClick={() => { if (formOpen && !editId) { setFormOpen(false); } else { openAdd(); } }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}
        >
          {formOpen && !editId ? <X size={16} /> : <Plus size={16} color="#42D674" />}
          {formOpen && !editId ? 'Cancel' : editId ? `Edit ${TYPE_STYLE[txType]?.label}` : 'Log New Transaction'}
        </button>

        {formOpen && (
          <form onSubmit={handleSubmit} style={{ padding: '0 20px 24px', borderTop: '1px solid var(--border)' }}>

            {/* ── Transaction type toggle ────────────────────────────── */}
            <div style={{ paddingTop: 20, marginBottom: 20 }}>
              <label style={lbl}>Transaction Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { id: 'direct_sale', label: 'Direct Sale',  sub: 'We sell fuel directly', icon: '🛢', activeColor: '#15803d', activeBg: '#42D674' },
                  { id: 'truck_lease', label: 'Truck Lease',  sub: 'Customer hires our truck', icon: '🚛', activeColor: 'white',   activeBg: '#2563eb' },
                ].map(t => {
                  const isActive = txType === t.id;
                  return (
                    <button
                      key={t.id} type="button" onClick={() => switchType(t.id)}
                      style={{
                        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                        border: isActive ? 'none' : '2px solid var(--border)',
                        background: isActive ? t.activeBg : 'var(--bg-input)',
                        boxShadow: isActive ? '0 4px 14px rgba(0,0,0,0.15)' : 'none',
                        transition: 'all 0.18s', textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{t.icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: isActive ? t.activeColor : 'var(--text-primary)', marginBottom: 2 }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: isActive ? (t.activeColor === 'white' ? 'rgba(255,255,255,0.8)' : 'rgba(21,128,61,0.7)') : 'var(--text-muted)' }}>{t.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── DIRECT SALE fields ─────────────────────────────────── */}
            {txType === 'direct_sale' && (
              <div style={grid}>
                <div><label style={lbl}>Date *</label>
                  <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required style={inp} /></div>

                <div><label style={lbl}>Customer Name *</label>
                  <input type="text" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Customer name" required style={inp} /></div>

                <div><label style={lbl}>Customer Phone</label>
                  <input type="text" value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} placeholder="080..." style={inp} /></div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={lbl}>Depot *</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {DEPOTS.map(d => (
                      <button key={d} type="button" onClick={() => set('depot_name', d)}
                        style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: form.depot_name === d ? '#42D674' : 'var(--bg-input)', color: form.depot_name === d ? '#060e08' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                        {d}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={form.depot_name} onChange={e => set('depot_name', e.target.value)} placeholder="Or type depot name…" required style={inp} />
                </div>

                <div><label style={lbl}>Product *</label>
                  <select value={form.product} onChange={e => set('product', e.target.value)} style={inp}>
                    {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                  </select></div>

                <div><label style={lbl}>Volume (Litres) *</label>
                  <input type="number" value={form.volume_litres} onChange={e => set('volume_litres', e.target.value)} placeholder="0" min="0" required style={inp} /></div>

                <div><label style={lbl}>Rate / Litre (₦) *</label>
                  <input type="number" value={form.rate_per_litre} onChange={e => set('rate_per_litre', e.target.value)} placeholder="0" min="0" required style={inp} /></div>

                <div><label style={lbl}>Total Amount</label>
                  <div style={{ ...inp, color: '#15803d', fontWeight: 800, fontSize: 17, cursor: 'default', border: '1px solid rgba(66,214,116,0.4)', background: 'rgba(66,214,116,0.06)' }}>{fmt(totalAmount)}</div></div>

                <div><label style={lbl}>Truck</label>
                  <select value={form.truck} onChange={e => set('truck', e.target.value)} style={inp}>
                    {TRUCKS.map(t => <option key={t}>{t}</option>)}
                  </select></div>

                <div><label style={lbl}>Driver</label>
                  <input type="text" value={form.driver} onChange={e => set('driver', e.target.value)} placeholder="Driver name" style={inp} /></div>

                <div><label style={lbl}>Waybill Number</label>
                  <input type="text" value={form.waybill_number} onChange={e => set('waybill_number', e.target.value)} placeholder="WB-001" style={inp} /></div>

                <div><label style={lbl}>Payment Status</label>
                  <select value={form.payment_status} onChange={e => set('payment_status', e.target.value)} style={inp}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select></div>

                <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Notes</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" rows={2} style={{ ...inp, resize: 'vertical' }} /></div>
              </div>
            )}

            {/* ── TRUCK LEASE fields ─────────────────────────────────── */}
            {txType === 'truck_lease' && (
              <div style={grid}>
                <div><label style={lbl}>Date *</label>
                  <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required style={inp} /></div>

                <div><label style={lbl}>Company / Individual *</label>
                  <input type="text" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Who is hiring the truck?" required style={inp} /></div>

                <div><label style={lbl}>Customer Phone</label>
                  <input type="text" value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} placeholder="080..." style={inp} /></div>

                <div><label style={lbl}>Customer Address</label>
                  <input type="text" value={form.customer_address} onChange={e => set('customer_address', e.target.value)} placeholder="Customer address" style={inp} /></div>

                <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Origin *</label>
                  <input type="text" value={form.origin} onChange={e => set('origin', e.target.value)} placeholder="e.g. Abonema Wharf Depot, PH" required style={inp} /></div>

                <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Destination *</label>
                  <input type="text" value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="e.g. Shell Industrial Area, Warri" required style={inp} /></div>

                <div><label style={lbl}>Product Being Hauled</label>
                  <select value={form.product_type} onChange={e => set('product_type', e.target.value)} style={inp}>
                    {PRODUCTS_ALL.map(p => <option key={p}>{p}</option>)}
                  </select></div>

                <div><label style={lbl}>Volume Being Hauled (L)</label>
                  <input type="number" value={form.lease_volume_litres} onChange={e => set('lease_volume_litres', e.target.value)} placeholder="Customer's product volume" min="0" style={inp} /></div>

                <div><label style={lbl}>Haulage Rate ₦ *</label>
                  <input type="number" value={form.haulage_rate} onChange={e => set('haulage_rate', e.target.value)} placeholder="Agreed fee for this trip" min="0" required style={inp} /></div>

                <div><label style={lbl}>Total (Haulage Fee)</label>
                  <div style={{ ...inp, color: '#1d4ed8', fontWeight: 800, fontSize: 17, cursor: 'default', border: '1px solid rgba(37,99,235,0.35)', background: 'rgba(37,99,235,0.06)' }}>{fmt(totalAmount)}</div></div>

                <div><label style={lbl}>Truck</label>
                  <select value={form.truck} onChange={e => set('truck', e.target.value)} style={inp}>
                    {TRUCKS.map(t => <option key={t}>{t}</option>)}
                  </select></div>

                <div><label style={lbl}>Driver</label>
                  <input type="text" value={form.driver} onChange={e => set('driver', e.target.value)} placeholder="Driver name" style={inp} /></div>

                <div><label style={lbl}>Waybill Number</label>
                  <input type="text" value={form.waybill_number} onChange={e => set('waybill_number', e.target.value)} placeholder="WB-001" style={inp} /></div>

                <div><label style={lbl}>Payment Status</label>
                  <select value={form.payment_status} onChange={e => set('payment_status', e.target.value)} style={inp}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select></div>

                <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Notes</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" rows={2} style={{ ...inp, resize: 'vertical' }} /></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button type="submit" disabled={saving}
                style={{ background: txType === 'truck_lease' ? '#2563eb' : '#42D674', color: txType === 'truck_lease' ? 'white' : '#060e08', border: 'none', borderRadius: 8, padding: '11px 28px', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : editId ? '💾 Update' : txType === 'truck_lease' ? '🚛 Log Lease' : '✅ Log Sale'}
              </button>
              <button type="button" onClick={() => { setFormOpen(false); setEditId(null); }}
                style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 20px', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Type tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-input)', borderRadius: 8, padding: 3 }}>
          {[['all','All'],['direct_sale','🛢 Direct'],['truck_lease','🚛 Leases']].map(([id,label]) => (
            <button key={id} onClick={() => setFType(id)}
              style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: fType === id ? (id === 'truck_lease' ? '#2563eb' : id === 'direct_sale' ? '#42D674' : 'var(--bg-card)') : 'transparent', color: fType === id ? (id === 'all' ? 'var(--text-primary)' : 'white') : 'var(--text-muted)', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, depot, route…"
            style={{ width: '100%', paddingLeft: 28, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px 8px 28px', color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {[
          { label: 'Truck',  val: fTruck,  set: setFTruck,  opts: TRUCKS   },
          { label: 'Status', val: fStatus, set: setFStatus, opts: STATUSES },
        ].map(f => (
          <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}>
            <option value="all">All {f.label}s</option>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
            No records found. Log your first transaction above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                  {['Date','Type','Customer','Route / Depot','Product','Vol / Fee','Amount','Truck','Driver','Status',''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const tt  = s.transaction_type || 'direct_sale';
                  const ts  = TYPE_STYLE[tt] ?? TYPE_STYLE.direct_sale;
                  const sc  = STATUS_STYLE[s.payment_status] ?? STATUS_STYLE.Pending;
                  const isDirect = tt === 'direct_sale';
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{s.date?.slice(0,10)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: ts.bg, color: ts.text, fontWeight: 700, padding: '3px 8px', borderRadius: 99, fontSize: 11, whiteSpace: 'nowrap', border: `1px solid ${ts.border}` }}>
                          {ts.icon} {ts.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.customer_name}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isDirect
                          ? (s.depot_name || '—')
                          : <span>{s.origin || '?'} <span style={{ color: 'var(--text-muted)' }}>→</span> {s.destination || '?'}</span>
                        }
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {isDirect
                          ? <span style={{ background: 'rgba(66,214,116,0.12)', color: '#15803d', fontWeight: 700, padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>{s.product || '—'}</span>
                          : <span style={{ background: 'rgba(37,99,235,0.10)',  color: '#1d4ed8', fontWeight: 700, padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>{s.product_type || '—'}</span>
                        }
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>
                        {isDirect
                          ? (s.volume_litres ? `${Number(s.volume_litres).toLocaleString()}L` : '—')
                          : <span style={{ color: '#1d4ed8', fontWeight: 600 }}>Flat fee</span>
                        }
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: isDirect ? '#15803d' : '#1d4ed8', whiteSpace: 'nowrap' }}>{fmt(s.total_amount)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>{s.truck || '—'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>{s.driver || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: sc.bg, color: sc.text, fontWeight: 600, padding: '3px 8px', borderRadius: 99, fontSize: 11, whiteSpace: 'nowrap' }}>{s.payment_status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEdit(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '4px 5px', borderRadius: 5 }} title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px 5px', borderRadius: 5 }} title="Delete"><Trash2 size={14} /></button>
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
