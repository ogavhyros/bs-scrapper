import { useState } from 'react';
import { Search, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

export default function AuthPage() {
  const [tab,             setTab]             = useState('login');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');

  const { login } = useAuth();

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // AuthContext sets user → App renders main UI
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      setSuccess('Account created! Switching to login…');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => switchTab('login'), 1400);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-card-lg px-6 py-7 sm:px-8 sm:py-8 mx-4">

        {/* ── Logo ───────────────────────────────────────────────────────── */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand rounded-card mb-3">
            <Search size={22} className="text-white" />
          </div>
          <h1 className="text-[22px] font-extrabold text-brand tracking-tight leading-none">
            Business Scout
          </h1>
          <p className="text-[13px] text-ink-muted mt-1">Smart business contact scraping</p>
        </div>

        {/* ── Tab toggle ─────────────────────────────────────────────────── */}
        <div className="flex bg-nav-active rounded-nav p-1 mb-6">
          {[{ id: 'login', label: 'Login' }, { id: 'signup', label: 'Sign Up' }].map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-nav transition-colors
                ${tab === t.id ? 'bg-white text-ink shadow-card' : 'text-ink-muted hover:text-ink-soft'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Login form ─────────────────────────────────────────────────── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label-xs block mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required autoFocus className="input-base"
              />
            </div>
            <div>
              <label className="label-xs block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required className="input-base pr-10"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-[13px] text-red-500 font-medium">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 lg:py-2.5 text-base lg:text-sm">
              {loading ? 'Logging in…' : 'Login'}
            </button>
            <p className="text-center text-[13px] text-ink-muted">
              Don't have an account?{' '}
              <button type="button" onClick={() => switchTab('signup')}
                className="text-brand font-semibold hover:underline">Sign up</button>
            </p>
          </form>
        )}

        {/* ── Sign up form ───────────────────────────────────────────────── */}
        {tab === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="label-xs block mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required autoFocus className="input-base"
              />
            </div>
            <div>
              <label className="label-xs block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters" required className="input-base pr-10"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label-xs block mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" required className="input-base pr-10"
                />
                <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors">
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error   && <p className="text-[13px] text-red-500   font-medium">{error}</p>}
            {success && <p className="text-[13px] text-green-600 font-medium">{success}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 lg:py-2.5 text-base lg:text-sm">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
            <p className="text-center text-[13px] text-ink-muted">
              Already have an account?{' '}
              <button type="button" onClick={() => switchTab('login')}
                className="text-brand font-semibold hover:underline">Login</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
