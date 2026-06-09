import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, X, Pencil, Trash2, Eye, Download, CheckCircle, Printer, Save, FileText } from 'lucide-react';
import { getAuthHeader } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

// ── helpers ──────────────────────────────────────────────────────────────────
const fC  = (v, d = 2) => `₦${Number(v || 0).toLocaleString('en-NG', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const fD  = (d) => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const tod = () => new Date().toISOString().split('T')[0];
const addD = (s, n) => { if (!s) return ''; const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };
const TERMS_DAYS = { 'Immediate': 0, '7 days': 7, '14 days': 14, '30 days': 30 };
const dueFrom = (issue, terms) => addD(issue, TERMS_DAYS[terms] ?? 7);
const num = (v) => parseFloat(v) || 0;

// ── status config ─────────────────────────────────────────────────────────────
const SC = {
  draft:   { label: 'Draft',   color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.25)' },
  sent:    { label: 'Sent',    color: '#2563eb', bg: 'rgba(37,99,235,0.12)',   border: 'rgba(37,99,235,0.25)'   },
  paid:    { label: 'Paid',    color: '#16a34a', bg: 'rgba(22,163,74,0.12)',   border: 'rgba(22,163,74,0.25)'   },
  overdue: { label: 'Overdue', color: '#dc2626', bg: 'rgba(220,38,38,0.12)',   border: 'rgba(220,38,38,0.25)'   },
};

const inp = { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 };

function Pill({ status }) {
  const c = SC[status] || SC.draft;
  return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{c.label}</span>;
}

// ── Invoice Template (preview & print) ───────────────────────────────────────
function InvoiceTemplate({ invoice, settings, items: propItems }) {
  const s = settings || {};
  const items = propItems || (Array.isArray(invoice?.line_items) ? invoice.line_items : JSON.parse(invoice?.line_items || '[]'));
  const subtotal = items.reduce((a, i) => a + num(i.qty) * num(i.rate), 0);
  const vatRate  = num(invoice?.vat_rate);
  const vatAmt   = subtotal * (vatRate / 100);
  const total    = num(invoice?.total_amount) || subtotal + vatAmt;
  const sc       = SC[invoice?.status] || SC.draft;

  return (
    <div style={{ background: 'white', color: '#111', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13, padding: 36 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 22 }}>
        <div style={{ flex: 1 }}>
          {s.logo_url
            ? <img src={s.logo_url} style={{ maxHeight: 52, maxWidth: 160, objectFit: 'contain', marginBottom: 10, display: 'block' }} alt="logo" />
            : <div style={{ width: 42, height: 42, background: '#42D674', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: 'white', marginBottom: 10 }}>A</div>
          }
          <div style={{ fontWeight: 900, fontSize: 15 }}>{s.company_name || 'APHL AFRICA'}</div>
          {s.registered_name && <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{s.registered_name}</div>}
          {s.address_line1   && <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{s.address_line1}</div>}
          {s.address_line2   && <div style={{ fontSize: 11, color: '#555' }}>{s.address_line2}</div>}
          {(s.city || s.state) && <div style={{ fontSize: 11, color: '#555' }}>{[s.city, s.state].filter(Boolean).join(', ')}</div>}
          {s.phone   && <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>Tel: {s.phone}</div>}
          {s.email   && <div style={{ fontSize: 11, color: '#555' }}>Email: {s.email}</div>}
          {s.rc_number && <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>RC: {s.rc_number}</div>}
          {s.tin       && <div style={{ fontSize: 10, color: '#888' }}>TIN: {s.tin}</div>}
        </div>
        <div style={{ textAlign: 'right', minWidth: 170 }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#42D674', letterSpacing: '-1px' }}>INVOICE</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>{invoice?.invoice_number || 'DRAFT'}</div>
          <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.9 }}>
            <div><span style={{ color: '#888' }}>Date: </span><strong>{fD(invoice?.issue_date)}</strong></div>
            {invoice?.due_date && <div><span style={{ color: '#888' }}>Due: </span><strong>{fD(invoice.due_date)}</strong></div>}
            <div><span style={{ color: '#888' }}>Terms: </span><strong>{invoice?.payment_terms || '7 days'}</strong></div>
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{sc.label}</span>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: '#e5e7eb', marginBottom: 18 }} />

      {/* Bill To */}
      <div style={{ background: '#f8f9fa', borderLeft: '4px solid #42D674', padding: '12px 16px', borderRadius: '0 8px 8px 0', marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#42D674', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Bill To</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{invoice?.client_name || '—'}</div>
        {invoice?.client_address && <div style={{ fontSize: 11, color: '#555', marginTop: 3, whiteSpace: 'pre-wrap' }}>{invoice.client_address}</div>}
        {invoice?.client_phone   && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Tel: {invoice.client_phone}</div>}
        {invoice?.client_email   && <div style={{ fontSize: 11, color: '#555' }}>Email: {invoice.client_email}</div>}
      </div>

      {/* Line items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#42D674' }}>
            {[['#', 30], ['Description', null], ['Qty', 80], ['Rate', 110], ['Amount', 110]].map(([h, w], i) => (
              <th key={h} style={{ padding: '9px 12px', textAlign: i >= 2 ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em', ...(w ? { width: w } : {}) }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: '14px 12px', color: '#aaa', fontStyle: 'italic' }}>No items</td></tr>
          ) : items.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
              <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top' }}>{i + 1}</td>
              <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0', whiteSpace: 'pre-wrap', verticalAlign: 'top' }}>{item.description}</td>
              <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', verticalAlign: 'top' }}>{num(item.qty).toLocaleString('en-NG')}</td>
              <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', verticalAlign: 'top' }}>{fC(item.rate)}</td>
              <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 600, verticalAlign: 'top' }}>{fC(num(item.qty) * num(item.rate))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f8f9fa' }}>
            <td colSpan={4} style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderTop: '2px solid #e5e7eb', fontSize: 12 }}>Subtotal:</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderTop: '2px solid #e5e7eb' }}>{fC(subtotal)}</td>
          </tr>
          {vatRate > 0 && (
            <tr style={{ background: '#f8f9fa' }}>
              <td colSpan={4} style={{ padding: '7px 12px', textAlign: 'right', color: '#555', fontSize: 12 }}>VAT ({vatRate}%):</td>
              <td style={{ padding: '7px 12px', textAlign: 'right' }}>{fC(vatAmt)}</td>
            </tr>
          )}
          <tr style={{ background: '#42D674' }}>
            <td colSpan={4} style={{ padding: '11px 12px', textAlign: 'right', fontSize: 14, fontWeight: 900, color: 'white' }}>TOTAL:</td>
            <td style={{ padding: '11px 12px', textAlign: 'right', fontSize: 14, fontWeight: 900, color: 'white' }}>{fC(total)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Payment + Notes + Signature */}
      <div style={{ display: 'flex', gap: 20, marginTop: 22 }}>
        <div style={{ flex: 1 }}>
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 16px', marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#42D674', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Payment Details</div>
            {s.bank_name      && <div style={{ fontSize: 12, marginBottom: 3 }}><strong>Bank:</strong> {s.bank_name}</div>}
            {s.account_name   && <div style={{ fontSize: 12, marginBottom: 3 }}><strong>Account Name:</strong> {s.account_name}</div>}
            {s.account_number && <div style={{ fontSize: 12 }}><strong>Account Number:</strong> {s.account_number}</div>}
          </div>
          {invoice?.notes && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Notes</div>
              <div style={{ fontSize: 12, color: '#555', whiteSpace: 'pre-line' }}>{invoice.notes}</div>
            </div>
          )}
        </div>
        <div style={{ width: 150, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#888' }}>{s.company_name || 'APHL AFRICA'}</div>
          <div style={{ marginTop: 28, borderTop: '1px solid #e5e7eb', paddingTop: 6, fontSize: 10, color: '#bbb' }}>Authorized Signature</div>
        </div>
      </div>
      <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #f0f0f0', textAlign: 'center', fontSize: 10, color: '#bbb' }}>
        This invoice was generated by Business Scout — APHL Africa
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const BLANK_FORM = { status: 'draft', client_name: '', client_address: '', client_phone: '', client_email: '', issue_date: tod(), due_date: dueFrom(tod(), '7 days'), payment_terms: '7 days', notes: '', vat_rate: 0, sale_id: null };
const BLANK_LINE = { description: '', qty: 1, rate: '' };

export default function InvoiceGenerator({ showToast }) {
  const [tab,          setTab]          = useState('create');
  const [type,         setType]         = useState(null);
  const [editingId,    setEditingId]    = useState(null);
  const [invoiceNum,   setInvoiceNum]   = useState(null);
  const [form,         setForm]         = useState({ ...BLANK_FORM });
  const [lineItems,    setLineItems]    = useState([{ ...BLANK_LINE }]);
  const [sales,        setSales]        = useState([]);
  const [invoices,     setInvoices]     = useState([]);
  const [settings,     setSettings]     = useState(null);
  const [settingsForm, setSettingsForm] = useState({});
  const [saving,       setSaving]       = useState(false);
  const [savingSet,    setSavingSet]    = useState(false);
  const [previewOpen,  setPreviewOpen]  = useState(false);
  const [previewData,  setPreviewData]  = useState(null);
  const [pdfLoading,   setPdfLoading]   = useState(null);
  const logoRef = useRef();

  // computed totals
  const subtotal = useMemo(() => lineItems.reduce((s, i) => s + num(i.qty) * num(i.rate), 0), [lineItems]);
  const vatAmt   = subtotal * (num(form.vat_rate) / 100);
  const total    = subtotal + vatAmt;

  const loadInvoices = () =>
    fetch(`${API}/api/aphl/invoices`, { headers: getAuthHeader() })
      .then(r => r.json()).then(d => setInvoices(Array.isArray(d) ? d : [])).catch(() => {});

  const loadSettings = () =>
    fetch(`${API}/api/aphl/invoice-settings`, { headers: getAuthHeader() })
      .then(r => r.json()).then(d => { setSettings(d); setSettingsForm(d); }).catch(() => {});

  const loadSales = () =>
    fetch(`${API}/api/aphl/sales`, { headers: getAuthHeader() })
      .then(r => r.json()).then(d => setSales(Array.isArray(d) ? d : [])).catch(() => {});

  useEffect(() => {
    loadSettings(); loadInvoices(); loadSales();
    // inject print styles
    const s = document.createElement('style');
    s.id = 'inv-print-styles';
    s.textContent = `#inv-print-root{display:none}@media print{body>*{visibility:hidden}#inv-print-root{visibility:visible;display:block!important;position:fixed;inset:0;background:white;z-index:9999;overflow:auto}#inv-print-root *{visibility:visible}}`;
    document.head.appendChild(s);
    return () => { document.getElementById('inv-print-styles')?.remove(); };
  }, []);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTermsChange = (terms) => {
    setForm(f => ({ ...f, payment_terms: terms, due_date: dueFrom(f.issue_date, terms) }));
  };

  const handleIssueDateChange = (date) => {
    setForm(f => ({ ...f, issue_date: date, due_date: dueFrom(date, f.payment_terms) }));
  };

  const handleSaleSelect = (saleId) => {
    sf('sale_id', saleId || null);
    if (!saleId) return;
    const sale = sales.find(s => String(s.id) === String(saleId));
    if (!sale) return;
    setForm(f => ({
      ...f,
      sale_id: sale.id,
      client_name:    sale.customer_name    || '',
      client_address: sale.customer_address || '',
      client_phone:   sale.customer_phone   || '',
      issue_date:     sale.date?.slice(0, 10) || tod(),
      due_date:       dueFrom(sale.date?.slice(0, 10) || tod(), f.payment_terms),
    }));
    if (type === 'truck_lease') {
      const desc = [
        'Haulage Service',
        (sale.origin && sale.destination) ? `${sale.origin} → ${sale.destination}` : '',
        sale.product        ? `Product: ${sale.product}`                    : '',
        sale.lease_volume_litres ? `Volume: ${Number(sale.lease_volume_litres).toLocaleString('en-NG')} L` : '',
        sale.truck          ? `Truck: ${sale.truck}`                        : '',
        sale.driver         ? `Driver: ${sale.driver}`                      : '',
        sale.waybill_number ? `Waybill: ${sale.waybill_number}`             : '',
      ].filter(Boolean).join('\n');
      setLineItems([{ description: desc, qty: 1, rate: num(sale.haulage_rate) }]);
    } else {
      const vol  = num(sale.volume_litres);
      const rate = num(sale.rate_per_litre);
      const desc = [
        `Supply of ${sale.product || 'Product'}`,
        sale.depot_name     ? `Depot: ${sale.depot_name}`         : '',
        sale.waybill_number ? `Waybill: ${sale.waybill_number}`   : '',
      ].filter(Boolean).join('\n');
      setLineItems([{ description: desc, qty: vol || 1, rate: rate || (vol > 0 ? num(sale.total_amount) / vol : 0) }]);
    }
  };

  const handleTypeSelect = (t) => {
    setType(t);
    setLineItems([{ ...BLANK_LINE }]);
    setForm(f => ({ ...f, notes: settings?.default_notes || '', vat_rate: num(settings?.vat_rate) }));
  };

  const handleNewInvoice = () => {
    setType(null); setEditingId(null); setInvoiceNum(null);
    setForm({ ...BLANK_FORM, notes: settings?.default_notes || '', vat_rate: num(settings?.vat_rate) });
    setLineItems([{ ...BLANK_LINE }]);
    setTab('create');
  };

  const handleEditInvoice = (inv) => {
    const items = Array.isArray(inv.line_items) ? inv.line_items : JSON.parse(inv.line_items || '[]');
    setType(inv.invoice_type);
    setEditingId(inv.id);
    setInvoiceNum(inv.invoice_number);
    setForm({
      status:         inv.status          || 'draft',
      client_name:    inv.client_name     || '',
      client_address: inv.client_address  || '',
      client_phone:   inv.client_phone    || '',
      client_email:   inv.client_email    || '',
      issue_date:     inv.issue_date?.slice(0, 10)  || tod(),
      due_date:       inv.due_date?.slice(0, 10)    || '',
      payment_terms:  inv.payment_terms   || '7 days',
      notes:          inv.notes           || '',
      vat_rate:       inv.vat_rate        || 0,
      sale_id:        inv.sale_id         || null,
    });
    setLineItems(items.length > 0 ? items : [{ ...BLANK_LINE }]);
    setTab('create');
  };

  const handleSave = async (mode = 'draft') => {
    if (!form.client_name.trim()) { showToast('Client name is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        invoice_type: type,
        ...form,
        line_items:   lineItems.filter(i => i.description || num(i.rate)),
        subtotal,
        vat_amount:   vatAmt,
        total_amount: total,
      };
      let saved;
      if (editingId) {
        const r = await fetch(`${API}/api/aphl/invoices/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error((await r.json()).error || 'Update failed');
        saved = await r.json();
      } else {
        const r = await fetch(`${API}/api/aphl/invoices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error((await r.json()).error || 'Save failed');
        saved = await r.json();
        setEditingId(saved.id);
        setInvoiceNum(saved.invoice_number);
      }
      loadInvoices();
      const savedItems = lineItems.filter(i => i.description || num(i.rate));

      if (mode === 'preview') {
        setPreviewData({ invoice: saved, items: savedItems });
        setPreviewOpen(true);
        showToast('Invoice saved', 'success');
      } else if (mode === 'pdf') {
        showToast('Invoice saved', 'success');
        await handleDownloadPDF(saved.id, saved.invoice_number, savedItems);
      } else {
        showToast(editingId ? 'Invoice updated' : 'Saved as draft', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async (id, invNumber, items) => {
    setPdfLoading(id);
    try {
      const r = await fetch(`${API}/api/aphl/invoices/${id}/pdf`, { headers: getAuthHeader() });
      if (r.ok && r.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await r.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `${invNumber || 'invoice'}.pdf`; a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback: show preview modal and let user print
        const inv = invNumber
          ? (await (await fetch(`${API}/api/aphl/invoices/${id}`, { headers: getAuthHeader() })).json())
          : null;
        if (inv) { setPreviewData({ invoice: inv, items }); setPreviewOpen(true); }
        showToast('PDF engine unavailable — use Print from preview', 'warning');
      }
    } catch {
      showToast('PDF download failed — use Print from preview', 'warning');
    } finally {
      setPdfLoading(null);
    }
  };

  const handlePrint = () => {
    const el = document.getElementById('inv-print-root');
    if (el) el.style.display = 'block';
    window.print();
    window.addEventListener('afterprint', () => { if (el) el.style.display = ''; }, { once: true });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
    await fetch(`${API}/api/aphl/invoices/${id}`, { method: 'DELETE', headers: getAuthHeader() });
    showToast('Invoice deleted', 'info');
    loadInvoices();
    if (editingId === id) handleNewInvoice();
  };

  const handleStatusChange = async (id, status) => {
    await fetch(`${API}/api/aphl/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ ...invoices.find(i => i.id === id), status }),
    });
    loadInvoices();
    showToast(`Marked as ${status}`, 'success');
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Logo must be under 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = ev.target.result;
      try {
        const r = await fetch(`${API}/api/aphl/invoice-settings/logo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ logo_url: b64 }),
        });
        if (!r.ok) throw new Error('Upload failed');
        setSettings(s => ({ ...s, logo_url: b64 }));
        setSettingsForm(f => ({ ...f, logo_url: b64 }));
        showToast('Logo uploaded', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    setSavingSet(true);
    try {
      const { logo_url, next_invoice_number, id, updated_at, ...editable } = settingsForm;
      const r = await fetch(`${API}/api/aphl/invoice-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(editable),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Save failed');
      const updated = await r.json();
      setSettings(updated); setSettingsForm(updated);
      showToast('Settings saved ✓', 'success');
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSavingSet(false); }
  };

  // ── History stats ───────────────────────────────────────────────────────────
  const hStats = useMemo(() => ({
    total:    invoices.reduce((s, i) => s + num(i.total_amount), 0),
    paid:     invoices.filter(i => i.status === 'paid').reduce((s, i) => s + num(i.total_amount), 0),
    pending:  invoices.filter(i => ['draft','sent'].includes(i.status)).reduce((s, i) => s + num(i.total_amount), 0),
    overdue:  invoices.filter(i => i.status === 'overdue').length,
  }), [invoices]);

  // ── Tab navigation ──────────────────────────────────────────────────────────
  const TABS = [
    { id: 'create',  label: editingId ? `Edit ${invoiceNum || ''}` : '+ Create Invoice' },
    { id: 'history', label: `History (${invoices.length})` },
    { id: 'settings',label: 'Settings' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Print-only root */}
      <div id="inv-print-root">
        {previewData && <InvoiceTemplate invoice={previewData.invoice} settings={settings} items={previewData.items} />}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '2px solid var(--border)', paddingBottom: 0, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '9px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? '#f59e0b' : 'var(--text-secondary)', borderBottom: tab === t.id ? '2px solid #f59e0b' : '2px solid transparent', marginBottom: -2, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
        {editingId && (
          <button onClick={handleNewInvoice}
            style={{ marginLeft: 'auto', padding: '7px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
            ← New Invoice
          </button>
        )}
      </div>

      {/* ── TAB 1: CREATE ────────────────────────────────────────────────────── */}
      {tab === 'create' && !type && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Choose Invoice Type</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select the type of invoice to generate</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { id: 'truck_lease', icon: '🚛', title: 'Truck Lease Invoice', desc: 'For haulage and delivery services — haulage rate charged per trip' },
              { id: 'direct_sale', icon: '🛢', title: 'Direct Sale Invoice', desc: 'For direct fuel product sales — rate charged per litre' },
            ].map(t => (
              <button key={t.id} onClick={() => handleTypeSelect(t.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, padding: '24px 22px', background: 'var(--bg-card)', border: '2px solid var(--border)', borderRadius: 14, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.background = '#fffbeb'; }}
                onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}>
                <span style={{ fontSize: 36 }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.desc}</div>
                </div>
                <div style={{ marginTop: 4, padding: '7px 16px', background: '#f59e0b', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>Select</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'create' && type && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type badge + link to sale */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              {type === 'truck_lease' ? '🚛 Truck Lease' : '🛢 Direct Sale'}
            </span>
            {invoiceNum && (
              <span style={{ background: 'rgba(66,214,116,0.12)', color: '#15803d', border: '1px solid rgba(66,214,116,0.3)', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                {invoiceNum}
              </span>
            )}
            <button onClick={() => { if (!editingId) { setType(null); setLineItems([{ ...BLANK_LINE }]); } }}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
              ← Change Type
            </button>
          </div>

          {/* Link to sale */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <label style={lbl}>Link to Existing Sale (optional — auto-fills client & items)</label>
            <select value={form.sale_id || ''} onChange={e => handleSaleSelect(e.target.value)} style={inp}>
              <option value="">— Fill manually —</option>
              {sales.map(s => (
                <option key={s.id} value={s.id}>
                  {s.date?.slice(0,10)} — {s.customer_name} — {fC(s.total_amount, 0)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
            {/* Left: form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Invoice Details */}
              <Section title="Invoice Details" color="#f59e0b">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={lbl}>Invoice Number</label>
                    <div style={{ ...inp, background: 'var(--bg-input)', color: 'var(--text-muted)', cursor: 'default' }}>
                      {invoiceNum || 'Auto-generated on save'}
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Status</label>
                    <select value={form.status} onChange={e => sf('status', e.target.value)} style={inp}>
                      {Object.entries(SC).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Payment Terms</label>
                    <select value={form.payment_terms} onChange={e => handleTermsChange(e.target.value)} style={inp}>
                      {Object.keys(TERMS_DAYS).map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Issue Date</label>
                    <input type="date" value={form.issue_date} onChange={e => handleIssueDateChange(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Due Date</label>
                    <input type="date" value={form.due_date} onChange={e => sf('due_date', e.target.value)} style={inp} />
                  </div>
                </div>
              </Section>

              {/* Client Details */}
              <Section title="Client Details" color="#3b82f6">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={lbl}>Client / Company Name *</label>
                    <input type="text" value={form.client_name} onChange={e => sf('client_name', e.target.value)} placeholder="Required" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Client Address</label>
                    <textarea value={form.client_address} onChange={e => sf('client_address', e.target.value)} rows={2} placeholder="Street, City, State" style={{ ...inp, resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={lbl}>Phone</label>
                      <input type="text" value={form.client_phone} onChange={e => sf('client_phone', e.target.value)} placeholder="+234…" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Email</label>
                      <input type="email" value={form.client_email} onChange={e => sf('client_email', e.target.value)} placeholder="client@email.com" style={inp} />
                    </div>
                  </div>
                </div>
              </Section>

              {/* Notes */}
              <Section title="Notes" color="#8b5cf6">
                <textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={3} placeholder="Additional notes or payment instructions…" style={{ ...inp, resize: 'vertical' }} />
              </Section>
            </div>

            {/* Right: line items + totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Line Items */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Line Items
                  <button onClick={() => setLineItems(li => [...li, { ...BLANK_LINE }])}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                    <Plus size={12} /> Add Item
                  </button>
                </div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {lineItems.map((item, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, position: 'relative' }}>
                      {lineItems.length > 1 && (
                        <button onClick={() => setLineItems(li => li.filter((_, i) => i !== idx))}
                          style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px 4px' }}>
                          <X size={13} />
                        </button>
                      )}
                      <div style={{ marginBottom: 8 }}>
                        <label style={lbl}>Description</label>
                        <textarea value={item.description} rows={3} onChange={e => setLineItems(li => li.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))}
                          placeholder={type === 'truck_lease' ? 'Haulage Service\nOrigin → Destination\nProduct: AGO' : 'Supply of AGO\nDepot: Name'}
                          style={{ ...inp, resize: 'vertical' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div>
                          <label style={lbl}>{type === 'direct_sale' ? 'Qty (L)' : 'Qty'}</label>
                          <input type="number" value={item.qty} min="0" onChange={e => setLineItems(li => li.map((it, i) => i === idx ? { ...it, qty: e.target.value } : it))} style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>{type === 'direct_sale' ? 'Rate/L (₦)' : 'Rate (₦)'}</label>
                          <input type="number" value={item.rate} min="0" onChange={e => setLineItems(li => li.map((it, i) => i === idx ? { ...it, rate: e.target.value } : it))} style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Amount</label>
                          <div style={{ ...inp, background: 'var(--bg-card)', color: '#16a34a', fontWeight: 700, cursor: 'default' }}>{fC(num(item.qty) * num(item.rate))}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>Totals</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{fC(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>VAT (%)</span>
                    <input type="number" value={form.vat_rate} min={0} max={100} onChange={e => sf('vat_rate', e.target.value)}
                      style={{ ...inp, width: 70, padding: '5px 8px', fontSize: 12 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{fC(vatAmt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid var(--border)' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>TOTAL</span>
                  <span style={{ fontSize: 17, fontWeight: 900, color: '#16a34a' }}>{fC(total)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button onClick={() => handleSave('draft')} disabled={saving}
                    style={{ padding: '11px 0', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                    <Save size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    {editingId ? 'Update' : 'Save Draft'}
                  </button>
                  <button onClick={() => handleSave('preview')} disabled={saving}
                    style={{ padding: '11px 0', background: '#16a34a', color: 'white', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                    <Eye size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Preview
                  </button>
                </div>
                <button onClick={() => handleSave('pdf')} disabled={saving || pdfLoading}
                  style={{ padding: '12px 0', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: (saving || pdfLoading) ? 'not-allowed' : 'pointer', opacity: (saving || pdfLoading) ? 0.6 : 1, boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
                  <Download size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {pdfLoading ? 'Generating…' : 'Save & Download PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: HISTORY ───────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Invoiced', value: fC(hStats.total, 0), color: '#1d4ed8', bg: 'rgba(37,99,235,0.08)' },
              { label: 'Total Paid',     value: fC(hStats.paid, 0),  color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
              { label: 'Total Pending',  value: fC(hStats.pending, 0), color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
              { label: 'Overdue',        value: `${hStats.overdue} invoice${hStats.overdue !== 1 ? 's' : ''}`, color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
            ].map(c => (
              <div key={c.label} style={{ flex: '1 1 160px', background: c.bg, borderRadius: 12, padding: '14px 18px', border: `1px solid ${c.color}22` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: c.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {invoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 13 }}>No invoices yet. Create your first invoice above.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                      {['Invoice #','Type','Client','Date','Due','Amount','Status','Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, i) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{inv.invoice_number}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {inv.invoice_type === 'truck_lease' ? '🚛 Lease' : '🛢 Sale'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-primary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.client_name}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fD(inv.issue_date)}</td>
                        <td style={{ padding: '10px 14px', color: inv.status === 'overdue' ? '#dc2626' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fD(inv.due_date)}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>{fC(inv.total_amount, 0)}</td>
                        <td style={{ padding: '10px 14px' }}><Pill status={inv.status} /></td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <button onClick={() => { const items = Array.isArray(inv.line_items) ? inv.line_items : JSON.parse(inv.line_items||'[]'); setPreviewData({ invoice: inv, items }); setPreviewOpen(true); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '3px 5px', borderRadius: 5 }} title="Preview"><Eye size={14} /></button>
                          <button onClick={() => handleDownloadPDF(inv.id, inv.invoice_number)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b', padding: '3px 5px', borderRadius: 5 }} title="Download PDF">
                            {pdfLoading === inv.id ? '…' : <Download size={14} />}
                          </button>
                          <button onClick={() => handleEditInvoice(inv)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '3px 5px', borderRadius: 5 }} title="Edit"><Pencil size={14} /></button>
                          {inv.status !== 'paid' && (
                            <button onClick={() => handleStatusChange(inv.id, 'paid')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: '3px 5px', borderRadius: 5 }} title="Mark Paid"><CheckCircle size={14} /></button>
                          )}
                          <button onClick={() => handleDelete(inv.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '3px 5px', borderRadius: 5 }} title="Delete"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: SETTINGS ──────────────────────────────────────────────────── */}
      {tab === 'settings' && settings && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>

          {/* Company Information */}
          <Section title="Company Information" color="#f59e0b">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'company_name',    label: 'Display Name'       },
                { key: 'registered_name', label: 'Registered Name'    },
                { key: 'address_line1',   label: 'Address Line 1'     },
                { key: 'address_line2',   label: 'Address Line 2'     },
                { key: 'city',            label: 'City'               },
                { key: 'state',           label: 'State'              },
                { key: 'phone',           label: 'Phone'              },
                { key: 'email',           label: 'Email'              },
                { key: 'website',         label: 'Website'            },
                { key: 'rc_number',       label: 'RC Number'          },
                { key: 'tin',             label: 'TIN'                },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input type="text" value={settingsForm[key] || ''} onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.value }))} style={inp} />
                </div>
              ))}
            </div>
          </Section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Bank Details */}
            <Section title="Bank Details" color="#16a34a">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'bank_name',      label: 'Bank Name'      },
                  { key: 'account_name',   label: 'Account Name'   },
                  { key: 'account_number', label: 'Account Number' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={lbl}>{label}</label>
                    <input type="text" value={settingsForm[key] || ''} onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.value }))} style={inp} />
                  </div>
                ))}
              </div>
            </Section>

            {/* Invoice Settings */}
            <Section title="Invoice Settings" color="#3b82f6">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={lbl}>Invoice Prefix</label>
                  <input type="text" value={settingsForm.invoice_prefix || ''} onChange={e => setSettingsForm(f => ({ ...f, invoice_prefix: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Next Invoice Number (current counter)</label>
                  <div style={{ ...inp, background: 'var(--bg-card)', color: 'var(--text-muted)', cursor: 'default' }}>
                    #{settings.next_invoice_number || 1} — auto-managed
                  </div>
                </div>
                <div>
                  <label style={lbl}>Default Payment Terms</label>
                  <select value={settingsForm.default_payment_terms || '7 days'} onChange={e => setSettingsForm(f => ({ ...f, default_payment_terms: e.target.value }))} style={inp}>
                    {Object.keys(TERMS_DAYS).map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>VAT Rate (%)</label>
                  <input type="number" min={0} max={100} value={settingsForm.vat_rate ?? 0} onChange={e => setSettingsForm(f => ({ ...f, vat_rate: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Default Notes</label>
                  <textarea value={settingsForm.default_notes || ''} onChange={e => setSettingsForm(f => ({ ...f, default_notes: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical' }} />
                </div>
              </div>
            </Section>

            {/* Logo Upload */}
            <Section title="Company Logo" color="#8b5cf6">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {settings.logo_url ? (
                  <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={settings.logo_url} style={{ maxHeight: 48, maxWidth: 140, objectFit: 'contain' }} alt="Current logo" />
                    <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Logo uploaded</span>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    No logo uploaded
                  </div>
                )}
                <input type="file" accept="image/png,image/jpeg,image/svg+xml" ref={logoRef} style={{ display: 'none' }} onChange={handleLogoUpload} />
                <button onClick={() => logoRef.current?.click()}
                  style={{ padding: '9px 16px', background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  {settings.logo_url ? '↑ Replace Logo' : '↑ Upload Logo'}
                </button>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG, JPG or SVG · max 2MB</div>
              </div>
            </Section>

            {/* Save button */}
            <button onClick={handleSaveSettings} disabled={savingSet}
              style={{ padding: '13px 0', background: '#16a34a', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: savingSet ? 'not-allowed' : 'pointer', opacity: savingSet ? 0.6 : 1, boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
              {savingSet ? 'Saving…' : '💾 Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ────────────────────────────────────────────────────── */}
      {previewOpen && previewData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={e => { if (e.target === e.currentTarget) setPreviewOpen(false); }}>
          <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', width: '100%', maxWidth: 780, boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#f8f9fa', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>
                Invoice Preview — {previewData.invoice.invoice_number}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  <Printer size={13} /> Print
                </button>
                <button onClick={() => handleDownloadPDF(previewData.invoice.id, previewData.invoice.invoice_number, previewData.items)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  <Download size={13} /> {pdfLoading ? 'Generating…' : 'Download PDF'}
                </button>
                <button onClick={() => setPreviewOpen(false)}
                  style={{ padding: '7px 10px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 7, cursor: 'pointer', color: '#6b7280' }}>
                  <X size={15} />
                </button>
              </div>
            </div>
            {/* Invoice content */}
            <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              <InvoiceTemplate invoice={previewData.invoice} settings={settings} items={previewData.items} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section card helper ───────────────────────────────────────────────────────
function Section({ title, color, children }) {
  return (
    <div style={{ border: `1px solid ${color}30`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: color, color: 'white', padding: '9px 16px', fontWeight: 700, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ padding: 14, background: 'var(--bg-card)' }}>{children}</div>
    </div>
  );
}
