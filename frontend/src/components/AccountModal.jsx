import { useState } from 'react';
import { Eye, EyeOff, X, LogOut, KeyRound } from 'lucide-react';
import { getAuthHeader } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

function PasswordField({ label, value, onChange, show, onToggle, placeholder, autoComplete }) {
  return (
    <div>
      <label className="label-xs block mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required autoComplete={autoComplete} className="input-base pr-10"
        />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

// Account panel: change password (+ logout, used on mobile where the sidebar is hidden).
export default function AccountModal({ email, onClose, onLogout, showToast }) {
  const [current, setCurrent] = useState('');
  const [next,    setNext]    = useState('');
  const [confirm, setConfirm] = useState('');
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (next.length < 6)   { setError('New password must be at least 6 characters.'); return; }
    if (next !== confirm)  { setError('New passwords do not match.'); return; }
    if (next === current)  { setError('New password must be different from the current one.'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not change password');
      showToast?.('Password changed');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div onClick={e => e.stopPropagation()} className="card w-full max-w-[400px] px-6 py-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[18px] font-bold text-ink flex items-center gap-2"><KeyRound size={18} /> Account</h2>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Close"><X size={18} /></button>
        </div>
        <p className="text-[13px] text-ink-muted mb-5 truncate">{email}</p>

        <form onSubmit={submit} className="space-y-4">
          <PasswordField label="Current Password" value={current} onChange={setCurrent}
            show={show} onToggle={() => setShow(v => !v)} placeholder="••••••••" autoComplete="current-password" />
          <PasswordField label="New Password" value={next} onChange={setNext}
            show={show} onToggle={() => setShow(v => !v)} placeholder="Min. 6 characters" autoComplete="new-password" />
          <PasswordField label="Confirm New Password" value={confirm} onChange={setConfirm}
            show={show} onToggle={() => setShow(v => !v)} placeholder="••••••••" autoComplete="new-password" />
          {error && <p className="text-[13px] text-red-500 font-medium">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 lg:py-2.5 text-base lg:text-sm">
            {loading ? 'Saving…' : 'Change Password'}
          </button>
        </form>

        {onLogout && (
          <button type="button" onClick={onLogout}
            className="lg:hidden mt-4 w-full flex items-center justify-center gap-2 py-2.5 text-[14px] font-semibold text-red-500 rounded-lg"
            style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'none' }}>
            <LogOut size={15} /> Logout
          </button>
        )}
      </div>
    </div>
  );
}
