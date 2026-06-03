import { useState, useEffect } from 'react';
import { Search, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

export default function AuthPage() {
  const [view,            setView]            = useState('login'); // login | signup | forgot | reset
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');
  const [resetToken,      setResetToken]      = useState('');
  const [forgotEmail,     setForgotEmail]     = useState('');

  const { login } = useAuth();

  // Detect ?token= in URL → show reset view
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    if (token) { setResetToken(token); setView('reset'); }
  }, []);

  const switchView = (v) => {
    setView(v);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
    setShowPw(false);
    setShowConfirmPw(false);
  };

  // ── Login ─────────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Signup ────────────────────────────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6)        { setError('Password must be at least 6 characters.'); return; }
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
      setTimeout(() => switchView('login'), 1400);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ───────────────────────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setSuccess('sent');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password ────────────────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6)        { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setSuccess('Password updated! Redirecting to login…');
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
        setResetToken('');
        switchView('login');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #E3F0A3 50%, #f0fdf4 100%)' }}>
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

        {/* ── Tab toggle — only for login / signup ───────────────────────── */}
        {(view === 'login' || view === 'signup') && (
          <div className="flex bg-nav-active rounded-nav p-1 mb-6">
            {[{ id: 'login', label: 'Login' }, { id: 'signup', label: 'Sign Up' }].map(t => (
              <button
                key={t.id}
                onClick={() => switchView(t.id)}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-nav transition-colors
                  ${view === t.id ? 'bg-white text-ink shadow-card' : 'text-ink-muted hover:text-ink-soft'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Login form ─────────────────────────────────────────────────── */}
        {view === 'login' && (
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
              <div className="text-right mt-1.5">
                <button type="button" onClick={() => switchView('forgot')}
                  className="text-[12px] text-brand hover:underline font-medium">
                  Forgot password?
                </button>
              </div>
            </div>
            {error && <p className="text-[13px] text-red-500 font-medium">{error}</p>}
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 lg:py-2.5 text-base lg:text-sm">
              {loading ? 'Logging in…' : 'Login'}
            </button>
            <p className="text-center text-[13px] text-ink-muted">
              Don't have an account?{' '}
              <button type="button" onClick={() => switchView('signup')}
                className="text-brand font-semibold hover:underline">Sign up</button>
            </p>
          </form>
        )}

        {/* ── Sign up form ───────────────────────────────────────────────── */}
        {view === 'signup' && (
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
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 lg:py-2.5 text-base lg:text-sm">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
            <p className="text-center text-[13px] text-ink-muted">
              Already have an account?{' '}
              <button type="button" onClick={() => switchView('login')}
                className="text-brand font-semibold hover:underline">Login</button>
            </p>
          </form>
        )}

        {/* ── Forgot password ─────────────────────────────────────────────── */}
        {view === 'forgot' && (
          <div>
            <button type="button" onClick={() => switchView('login')}
              className="flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-5 transition-colors">
              <ArrowLeft size={14} /> Back to login
            </button>
            <h2 className="text-[18px] font-bold text-ink mb-1">Reset Password</h2>
            <p className="text-[13px] text-ink-muted mb-5">
              Enter your email and we'll send you a reset link.
            </p>

            {success === 'sent' ? (
              <div className="text-center py-4">
                <CheckCircle size={44} className="text-brand mx-auto mb-3" />
                <p className="font-semibold text-ink text-[15px]">Check your email!</p>
                <p className="text-[13px] text-ink-muted mt-1">
                  We sent a reset link to{' '}
                  <span className="font-medium text-ink">{forgotEmail}</span>
                </p>
                <button type="button" onClick={() => switchView('login')}
                  className="mt-5 text-[13px] text-brand font-semibold hover:underline">
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="label-xs block mb-1.5">Email</label>
                  <input
                    type="email" value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@example.com" required autoFocus className="input-base"
                  />
                </div>
                {error && <p className="text-[13px] text-red-500 font-medium">{error}</p>}
                <button type="submit" disabled={loading}
                  className="btn-primary w-full justify-center py-3 lg:py-2.5 text-base lg:text-sm">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <p className="text-center text-[13px] text-ink-muted">
                  <button type="button" onClick={() => switchView('login')}
                    className="text-brand font-semibold hover:underline">Back to login</button>
                </p>
              </form>
            )}
          </div>
        )}

        {/* ── Reset password ──────────────────────────────────────────────── */}
        {view === 'reset' && (
          <div>
            <h2 className="text-[18px] font-bold text-ink mb-1">Create New Password</h2>
            <p className="text-[13px] text-ink-muted mb-5">
              Choose a new password for your account.
            </p>

            {success ? (
              <div className="text-center py-4">
                <CheckCircle size={44} className="text-brand mx-auto mb-3" />
                <p className="font-semibold text-ink text-[15px]">{success}</p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="label-xs block mb-1.5">New Password</label>
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
                  <label className="label-xs block mb-1.5">Confirm New Password</label>
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
                {error && <p className="text-[13px] text-red-500 font-medium">{error}</p>}
                <button type="submit" disabled={loading}
                  className="btn-primary w-full justify-center py-3 lg:py-2.5 text-base lg:text-sm">
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
                <p className="text-center text-[13px] text-ink-muted">
                  <button type="button" onClick={() => {
                    window.history.replaceState({}, '', window.location.pathname);
                    setResetToken('');
                    switchView('login');
                  }} className="text-brand font-semibold hover:underline">
                    Back to login
                  </button>
                </p>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
