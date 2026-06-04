import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? '';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:      '#060e08',
  card:    '#0c160e',
  border:  '#1c3322',
  brand:   '#42D674',
  brandDk: '#2ab55d',
  dim:     '#3a5c42',
  textHi:  '#e8f5ec',
  textMd:  '#8aad8f',
  textLo:  '#3d5c43',
};

// ── Ticker items ──────────────────────────────────────────────────────────────
const TICKER = [
  '🟢 Google Places Scraper',
  '⚡ Up to 100 contacts per search',
  '📞 Built-in CRM pipeline',
  '💼 LinkedIn employee finder',
  '📊 Data quality scoring',
  '📥 One-click Excel export',
  '🔐 Secure JWT auth',
  '🗑️ Bulk contact cleanup',
];

// ── Feature cards ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🔍',
    title: 'Google Places Scraper',
    desc:  'Search any keyword + location. Pulls phone, website, address, and ratings from Google — up to 100 contacts per run.',
  },
  {
    icon: '📞',
    title: 'CRM Pipeline',
    desc:  'Track call status, log outcomes, set follow-up dates and priorities. Never lose track of a lead.',
  },
  {
    icon: '💼',
    title: 'LinkedIn Intelligence',
    desc:  'Find decision-makers at any company by job role and country using the NinjaPear employee API.',
  },
  {
    icon: '📊',
    title: 'Data Quality Scoring',
    desc:  'Every contact is scored NO DATA / PARTIAL / COMPLETE. Filter and focus only on actionable leads.',
  },
  {
    icon: '📥',
    title: 'One-Click Excel Export',
    desc:  'Download a formatted workbook with a Business Contacts sheet and a CRM Tracker sheet ready to use offline.',
  },
  {
    icon: '🗑️',
    title: 'Smart Bulk Cleanup',
    desc:  'Select and delete low-quality contacts in bulk, or wipe all no-data entries with one click.',
  },
];

// ── Mini dashboard mockup ─────────────────────────────────────────────────────
function DashboardMockup() {
  const navItems = ['Scraper', 'Contacts', 'Analytics', 'CRM', 'LinkedIn'];
  const cards    = [
    { label: 'No Data', val: '12', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
    { label: 'Partial',  val: '47', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
    { label: 'Complete', val: '50', color: '#42D674', bg: 'rgba(66,214,116,0.12)' },
    { label: 'Total',    val: '109', color: C.textHi, bg: 'rgba(255,255,255,0.05)' },
  ];
  const rows = [
    { name: 'Sunrise Dental Clinic',    tag: 'COMPLETE', tc: '#42D674', tb: 'rgba(66,214,116,0.15)' },
    { name: 'Lagos Tech Hub',           tag: 'PARTIAL',  tc: '#d97706', tb: 'rgba(217,119,6,0.15)' },
    { name: 'Apex Construction Ltd',    tag: 'COMPLETE', tc: '#42D674', tb: 'rgba(66,214,116,0.15)' },
    { name: 'Green Valley Farms',       tag: 'NO DATA',  tc: '#dc2626', tb: 'rgba(220,38,38,0.15)' },
  ];

  return (
    <div
      className="float-mock"
      style={{
        width: '100%', maxWidth: 520,
        background: '#0c160e',
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(66,214,116,0.1)',
        fontSize: 12,
      }}
    >
      {/* title bar */}
      <div style={{ background: '#080f0a', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${C.border}` }}>
        {['#ff5f57','#febc2e','#28c840'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
        ))}
        <span style={{ marginLeft: 8, color: C.textMd, fontSize: 11, fontFamily: 'monospace' }}>
          bs-scrapper-ivory.vercel.app
        </span>
      </div>

      <div style={{ display: 'flex', height: 340 }}>
        {/* sidebar */}
        <div style={{ width: 120, background: '#080f0a', borderRight: `1px solid ${C.border}`, padding: '14px 0', flexShrink: 0 }}>
          <div style={{ padding: '0 12px 14px', borderBottom: `1px solid ${C.border}`, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>📍</div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#1a2e1a', lineHeight: 1.2 }}>Business</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.brand, lineHeight: 1.2 }}>Scout</div>
              </div>
            </div>
          </div>
          {navItems.map((item, i) => (
            <div key={item} style={{
              padding: '7px 12px',
              color: i === 0 ? C.brand : C.textMd,
              fontWeight: i === 0 ? 700 : 400,
              fontSize: 11,
              background: i === 0 ? 'rgba(66,214,116,0.08)' : 'transparent',
              borderLeft: i === 0 ? `2px solid ${C.brand}` : '2px solid transparent',
              cursor: 'default',
            }}>
              {item}
            </div>
          ))}
        </div>

        {/* content */}
        <div style={{ flex: 1, padding: 14, overflowY: 'hidden' }}>
          <div style={{ color: C.textHi, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Contact Scraper</div>

          {/* stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
            {cards.map(c => (
              <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: c.color }}>{c.val}</div>
                <div style={{ fontSize: 9, color: c.color, opacity: 0.8, marginTop: 2 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* contact rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rows.map(r => (
              <div key={r.name} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ color: C.textHi, fontSize: 11, fontWeight: 600 }}>{r.name}</div>
                <div style={{ background: r.tb, color: r.tc, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>{r.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Auth panel ────────────────────────────────────────────────────────────────
function AuthPanel() {
  const { login } = useAuth();
  const [tab,             setTab]             = useState('login');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');

  const switchTab = (t) => { setTab(t); setError(''); setPassword(''); setConfirmPassword(''); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await login(email, password); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6)         { setError('Password must be at least 6 characters.'); return; }
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
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: '#0c160e', border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '11px 14px', color: C.textHi,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: C.textMd, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '36px 40px', width: '100%', maxWidth: 420 }}>
      {/* logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: C.brand, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 12, boxShadow: '0 6px 20px rgba(66,214,116,0.3)' }}>
          📍
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.textHi, letterSpacing: '-0.4px' }}>
          Business <span style={{ color: C.brand }}>Scout</span>
        </div>
        <div style={{ fontSize: 13, color: C.textMd, marginTop: 4 }}>
          {tab === 'login' ? 'Sign in to your account' : 'Create a free account'}
        </div>
      </div>

      {/* tab toggle */}
      <div style={{ display: 'flex', background: '#060e08', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
        {[['login','Login'],['signup','Sign Up']].map(([id, label]) => (
          <button
            key={id} type="button" onClick={() => switchTab(id)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
              background: tab === id ? C.brand : 'transparent',
              color:      tab === id ? '#060e08'  : C.textMd,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={tab === 'login' ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" required autoFocus
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = C.brand; }}
            onBlur={e =>  { e.target.style.borderColor = C.border; }}
          />
        </div>

        <div>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'}
              required style={{ ...inputStyle, paddingRight: 42 }}
              onFocus={e => { e.target.style.borderColor = C.brand; }}
              onBlur={e =>  { e.target.style.borderColor = C.border; }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMd, cursor: 'pointer', padding: 0, display: 'flex' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {tab === 'signup' && (
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••" required style={inputStyle}
              onFocus={e => { e.target.style.borderColor = C.brand; }}
              onBlur={e =>  { e.target.style.borderColor = C.border; }}
            />
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ background: loading ? C.dim : C.brand, color: '#060e08', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s', letterSpacing: '-0.2px' }}>
          {loading ? (tab === 'login' ? 'Signing in…' : 'Creating account…') : (tab === 'login' ? 'Sign In →' : 'Create Account →')}
        </button>

        {tab === 'login' && (
          <p style={{ textAlign: 'center', fontSize: 13, color: C.textMd, margin: 0 }}>
            Don't have an account?{' '}
            <button type="button" onClick={() => switchTab('signup')}
              style={{ background: 'none', border: 'none', color: C.brand, fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: 0 }}>
              Sign up free
            </button>
          </p>
        )}
        {tab === 'signup' && (
          <p style={{ textAlign: 'center', fontSize: 13, color: C.textMd, margin: 0 }}>
            Already have an account?{' '}
            <button type="button" onClick={() => switchTab('login')}
              style={{ background: 'none', border: 'none', color: C.brand, fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: 0 }}>
              Sign in
            </button>
          </p>
        )}
      </form>
    </div>
  );
}

// ── LandingPage ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const tickerItems = [...TICKER, ...TICKER]; // duplicate for seamless loop

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.textHi, fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* ── TICKER BAR ────────────────────────────────────────────────────── */}
      <div style={{ background: '#0a1a0c', borderBottom: `1px solid ${C.border}`, overflow: 'hidden', height: 36, display: 'flex', alignItems: 'center' }}>
        <div className="ticker-track">
          {tickerItems.map((item, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 28px', fontSize: 12, fontWeight: 600, color: C.textMd, whiteSpace: 'nowrap', gap: 28 }}>
              {item}
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.dim, display: 'inline-block', marginLeft: 28 }} />
            </span>
          ))}
        </div>
      </div>

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: 'rgba(6,14,8,0.92)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 4px 12px rgba(66,214,116,0.3)' }}>📍</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.textHi, letterSpacing: '-0.3px', lineHeight: 1.1 }}>Business <span style={{ color: C.brand }}>Scout</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="#auth" style={{ color: C.textMd, fontSize: 14, fontWeight: 600, textDecoration: 'none', padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`, transition: 'all 0.15s' }}
            onMouseOver={e => { e.target.style.color = C.textHi; e.target.style.borderColor = C.dim; }}
            onMouseOut={e =>  { e.target.style.color = C.textMd; e.target.style.borderColor = C.border; }}>
            Sign In
          </a>
          <a href="#auth" style={{ background: C.brand, color: '#060e08', fontSize: 14, fontWeight: 800, textDecoration: 'none', padding: '8px 20px', borderRadius: 8 }}>
            Get Started
          </a>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 48px 60px', display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap' }}>

        {/* left copy */}
        <div style={{ flex: '1 1 400px', minWidth: 300 }}>
          <div className="fade-up-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(66,214,116,0.1)', border: `1px solid rgba(66,214,116,0.25)`, borderRadius: 99, padding: '5px 14px', marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.brand, display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.brand, letterSpacing: '0.05em' }}>GOOGLE PLACES · LINKEDIN · CRM</span>
          </div>

          <h1 className="fade-up-2" style={{ fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-1.5px', margin: '0 0 20px', color: C.textHi }}>
            Find business contacts<br />
            <span style={{ color: C.brand }}>10× faster</span>
          </h1>

          <p className="fade-up-3" style={{ fontSize: 16, color: C.textMd, lineHeight: 1.7, maxWidth: 480, marginBottom: 36 }}>
            Scrape Google Places for real phone numbers and websites. Score leads automatically. Track every call in the built-in CRM. Export to Excel in one click.
          </p>

          <div className="fade-up-3" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a href="#auth" style={{ background: C.brand, color: '#060e08', fontWeight: 800, fontSize: 15, padding: '14px 28px', borderRadius: 10, textDecoration: 'none', letterSpacing: '-0.2px', boxShadow: '0 6px 24px rgba(66,214,116,0.35)' }}>
              Start for free →
            </a>
            <a href="#features" style={{ background: 'transparent', color: C.textHi, fontWeight: 600, fontSize: 15, padding: '14px 28px', borderRadius: 10, textDecoration: 'none', border: `1px solid ${C.border}` }}>
              See features
            </a>
          </div>

          {/* social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 40, paddingTop: 32, borderTop: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
            {[['109+', 'Contacts scraped'], ['5×', 'Pages per search'], ['100%', 'Free to start']].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.brand, letterSpacing: '-0.5px' }}>{n}</div>
                <div style={{ fontSize: 12, color: C.textMd, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* right mockup */}
        <div style={{ flex: '1 1 420px', minWidth: 320, display: 'flex', justifyContent: 'center' }}>
          <DashboardMockup />
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.brand, letterSpacing: '0.12em', marginBottom: 12, textTransform: 'uppercase' }}>Everything you need</div>
          <h2 style={{ fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: 900, color: C.textHi, letterSpacing: '-0.8px', margin: 0 }}>
            One tool. Full pipeline.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 28px 24px', transition: 'border-color 0.2s, transform 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = C.dim; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseOut={e =>  { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ fontSize: 30, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C.textHi, margin: '0 0 8px', letterSpacing: '-0.3px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: C.textMd, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AUTH SECTION ──────────────────────────────────────────────────── */}
      <section id="auth" style={{ padding: '60px 24px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: 'clamp(26px,3vw,38px)', fontWeight: 900, color: C.textHi, letterSpacing: '-0.7px', margin: '0 0 10px' }}>
            Ready to start scraping?
          </h2>
          <p style={{ fontSize: 15, color: C.textMd, margin: 0 }}>Create your free account — no credit card needed.</p>
        </div>
        <AuthPanel />
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '28px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📍</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textMd }}>Business Scout</span>
        </div>
        <p style={{ fontSize: 12, color: C.textLo, margin: 0 }}>
          © 2026 Business Scout · Built for lead generation pros
        </p>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Google Places', 'LinkedIn', 'CRM', 'Excel Export'].map(t => (
            <span key={t} style={{ fontSize: 12, color: C.textLo }}>{t}</span>
          ))}
        </div>
      </footer>

    </div>
  );
}
