import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Pencil, Trash2, Search } from 'lucide-react';
import { getAuthHeader } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

const today    = () => new Date().toISOString().split('T')[0];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const fmt = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

const CATEGORIES = [
  { label: 'Diesel',              icon: '🛢',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { label: 'Truck Maintenance',   icon: '🔧',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  { label: 'Driver Wages',        icon: '👷',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  { label: 'NMDPRA / Permits',    icon: '📋',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  { label: 'Toll Fees',           icon: '🛣',  color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  { label: 'Depot Charges',       icon: '🏭',  color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  { label: 'Office Expenses',     icon: '🏢',  color: '#14b8a6', bg: 'rgba(20,184,166,0.12)'  },
  { label: 'Miscellaneous',       icon: '📦',  color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.label, c]));

const TRUCKS         = ['Truck 1', 'Truck 2', 'Both', 'N/A'];
const PAY_METHODS    = ['Cash', 'Transfer', 'POS'];

const BLANK = { date: today(), category: 'Diesel', description: '', amount: '', truck: 'N/A', receipt_number: '', vendor: '', payment_method: 'Cash', notes: '' };

function StatCard({ label, value, icon, color, bg }) {
  return (
    <div style={{ flex: '1 1 140px', background: bg, borderRadius: 12, padding: '16px 18px', border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{icon} {label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

export default function ExpenseTab({ showToast }) {
  const [expenses,  setExpenses]  = useState([]);
  const [formOpen,  setFormOpen]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(BLANK);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState('');
  const [fCat,      setFCat]      = useState('all');
  const [fTruck,    setFTruck]    = useState('all');

  const load = () =>
    fetch(`${API}/api/aphl/expenses`, { headers: getAuthHeader() })
      .then(r => r.json()).then(setExpenses).catch(() => {});

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd  = () => { setForm(BLANK); setEditId(null); setFormOpen(true); };
  const openEdit = (e) => {
    setForm({
      date: e.date?.slice(0,10) ?? today(), category: e.category, description: e.description,
      amount: e.amount, truck: e.truck || 'N/A', receipt_number: e.receipt_number || '',
      vendor: e.vendor || '', payment_method: e.payment_method || 'Cash', notes: e.notes || '',
    });
    setEditId(e.id); setFormOpen(true);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!form.description || !form.amount || !form.category) { showToast('Fill all required fields', 'error'); return; }
    setSaving(true);
    try {
      const url    = editId ? `${API}/api/aphl/expenses/${editId}` : `${API}/api/aphl/expenses`;
      const method = editId ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast(editId ? 'Expense updated' : 'Expense logged', 'success');
      setFormOpen(false); setEditId(null); setForm(BLANK); load();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await fetch(`${API}/api/aphl/expenses/${id}`, { method: 'DELETE', headers: getAuthHeader() });
    showToast('Expense deleted', 'info'); load();
  };

  const now = thisMonth();
  const monthExp = useMemo(() => expenses.filter(e => e.date?.slice(0,7) === now), [expenses, now]);
  const stats = useMemo(() => {
    const total = monthExp.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const bycat = {};
    for (const e of monthExp) { bycat[e.category] = (bycat[e.category] || 0) + parseFloat(e.amount || 0); }
    const topCat = Object.entries(bycat).sort((a,b) => b[1]-a[1])[0];
    return { total, count: monthExp.length, topCat: topCat ? topCat[0] : '—' };
  }, [monthExp]);

  const filtered = useMemo(() => {
    let list = [...expenses];
    if (fCat   !== 'all') list = list.filter(e => e.category === fCat);
    if (fTruck !== 'all') list = list.filter(e => e.truck    === fTruck);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.description?.toLowerCase().includes(q) || e.vendor?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q));
    }
    return list;
  }, [expenses, fCat, fTruck, search]);

  const inputCls = { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelCls = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard label="Total Expenses"  value={fmt(stats.total)} icon="📤" color="#dc2626" bg="rgba(239,68,68,0.08)"   />
        <StatCard label="Top Category"    value={stats.topCat}     icon="🏆" color="#92400e" bg="rgba(245,158,11,0.08)"  />
        <StatCard label="Expenses Logged" value={stats.count}      icon="📋" color="#1d4ed8" bg="rgba(37,99,235,0.06)"   />
        <StatCard label="Avg per Trip"    value="—"                icon="📊" color="#6b7280" bg="rgba(107,114,128,0.06)" />
      </div>

      {/* Add form toggle */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <button
          onClick={() => { setFormOpen(o => !o); setEditId(null); setForm(BLANK); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>
          {formOpen && !editId ? <X size={16} /> : <Plus size={16} color="#ef4444" />}
          {formOpen && !editId ? 'Cancel' : 'Log New Expense'}
        </button>

        {formOpen && (
          <form onSubmit={handleSubmit} style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, paddingTop: 16 }}>

              <div><label style={labelCls}>Date *</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required style={inputCls} /></div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelCls}>Category *</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORIES.map(c => (
                    <button key={c.label} type="button" onClick={() => set('category', c.label)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${c.color}44`, background: form.category === c.label ? c.color : c.bg, color: form.category === c.label ? 'white' : c.color, transition: 'all 0.15s' }}>
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}><label style={labelCls}>Description *</label>
                <input type="text" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What was this expense for?" required style={inputCls} /></div>

              <div><label style={labelCls}>Amount ₦ *</label>
                <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" min="0" required style={inputCls} /></div>

              <div><label style={labelCls}>Truck</label>
                <select value={form.truck} onChange={e => set('truck', e.target.value)} style={inputCls}>
                  {TRUCKS.map(t => <option key={t}>{t}</option>)}
                </select></div>

              <div><label style={labelCls}>Vendor / Paid To</label>
                <input type="text" value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Company or person" style={inputCls} /></div>

              <div><label style={labelCls}>Receipt Number</label>
                <input type="text" value={form.receipt_number} onChange={e => set('receipt_number', e.target.value)} placeholder="RCP-001" style={inputCls} /></div>

              <div><label style={labelCls}>Payment Method</label>
                <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} style={inputCls}>
                  {PAY_METHODS.map(p => <option key={p}>{p}</option>)}
                </select></div>

              <div style={{ gridColumn: 'span 2' }}><label style={labelCls}>Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." rows={2} style={{ ...inputCls, resize: 'vertical' }} /></div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button type="submit" disabled={saving}
                style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : editId ? '💾 Update Expense' : '📤 Log Expense'}
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
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description, vendor, category…"
            style={{ width: '100%', paddingLeft: 32, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 32px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={fCat} onChange={e => setFCat(e.target.value)}
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.icon} {c.label}</option>)}
        </select>
        <select value={fTruck} onChange={e => setFTruck(e.target.value)}
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
          <option value="all">All Trucks</option>
          {TRUCKS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No expense records found. Log your first expense above.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                  {['Date','Category','Description','Amount','Truck','Vendor','Receipt','Payment','Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const cc = CAT_MAP[e.category] ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: '📦' };
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{e.date?.slice(0,10)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: cc.bg, color: cc.color, fontWeight: 600, padding: '3px 10px', borderRadius: 99, fontSize: 11, whiteSpace: 'nowrap' }}>{cc.icon} {e.category}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>{e.description}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>{fmt(e.amount)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{e.truck || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{e.vendor || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{e.receipt_number || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{e.payment_method}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEdit(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '4px 6px', borderRadius: 6 }} title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px 6px', borderRadius: 6 }} title="Delete"><Trash2 size={14} /></button>
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
