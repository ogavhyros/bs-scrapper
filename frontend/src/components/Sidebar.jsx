import { Home, TrendingUp, Receipt, Calculator, FileText, Search, Users, Phone, BarChart2, LogOut } from 'lucide-react';
import LinkedInIcon from './LinkedInIcon';
import { useTheme } from '../context/ThemeContext';

// ── Nav sections ──────────────────────────────────────────────────────────────

const APHL_NAV = [
  { id: 'overview',    label: 'Overview',        icon: Home       },
  { id: 'sales',       label: 'Sales Logger',    icon: TrendingUp },
  { id: 'expenses',    label: 'Expense Logger',  icon: Receipt    },
  { id: 'calculator',  label: 'Rate Calculator',   icon: Calculator },
  { id: 'invoices',   label: 'Invoice Generator', icon: FileText   },
];

const SCOUT_NAV = [
  { id: 'scraper',  label: 'Contact Scraper',  icon: Search        },
  { id: 'contacts', label: 'All Contacts',     icon: Users         },
  { id: 'crm',      label: 'CRM',              icon: Phone         },
  { id: 'linkedin', label: 'LinkedIn',         icon: LinkedInIcon, iconColor: '#0077b5', badgeColor: '#0077b5' },
  { id: 'analytics',label: 'Analytics',        icon: BarChart2     },
];

const APHL_IDS  = new Set(APHL_NAV.map(n => n.id));
const SCOUT_IDS = new Set(SCOUT_NAV.map(n => n.id));

function SectionLabel({ icon, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 12px 6px', marginTop: 4 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `${color}33`, marginLeft: 4 }} />
    </div>
  );
}

function NavItem({ item, active, badge, onClick }) {
  const { id, label, icon: Icon, iconColor, badgeColor } = item;

  const isAphl  = APHL_IDS.has(id);
  const activeConfig = isAphl
    ? { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' }
    : { bg: '#f0fdf4', text: '#15803d', border: '#42D674' };

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '9px 12px', borderRadius: 8,
        border: 'none', cursor: 'pointer', fontSize: 13,
        fontWeight: active ? 700 : 500, textAlign: 'left',
        transition: 'all 0.15s',
        background: active ? activeConfig.bg : 'transparent',
        color: active ? activeConfig.text : 'var(--text-secondary)',
        boxShadow: active ? `inset 3px 0 0 ${activeConfig.border}` : 'none',
      }}
      onMouseOver={e => { if (!active) e.currentTarget.style.background = 'var(--bg-nav-hover, rgba(66,214,116,0.06))'; }}
      onMouseOut={e =>  { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon
        size={16}
        style={{ color: active ? activeConfig.text : (iconColor || 'var(--text-muted)'), flexShrink: 0 }}
      />
      <span style={{ flex: 1, lineHeight: 1.2 }}>{label}</span>
      {badge != null && badge > 0 && (
        <span style={{ background: badgeColor || '#42D674', color: 'white', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99, minWidth: 20, textAlign: 'center' }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar({ activeTab, setActiveTab, totalContacts, crmCount, linkedinCount, userEmail, onLogout }) {
  const { isDark, toggleTheme } = useTheme();

  const badges = {
    contacts: totalContacts,
    crm:      crmCount,
    linkedin: linkedinCount,
  };

  return (
    <aside style={{
      width: 240, minWidth: 240, height: '100vh',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
    }} className="hidden lg:flex">

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#42D674', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(66,214,116,0.3)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="10" r="5" fill="white"/>
              <circle cx="12" cy="10" r="3" fill="#42D674"/>
              <circle cx="12" cy="10" r="1.3" fill="white"/>
              <path d="M12 15 L12 21" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M8 19 L12 21 L16 19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1.15 }}>APHL Africa</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#42D674', letterSpacing: '-0.1px', lineHeight: 1.15 }}>Business Scout</div>
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav style={{ padding: '4px 8px', flex: 1, overflowY: 'auto' }}>

        {/* APHL Africa section */}
        <SectionLabel icon="🔥" label="APHL Africa" color="#f59e0b" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
          {APHL_NAV.map(item => (
            <NavItem key={item.id} item={item} active={activeTab === item.id} onClick={() => setActiveTab(item.id)} />
          ))}
        </div>

        {/* Business Scout section */}
        <SectionLabel icon="📍" label="Business Scout" color="#42D674" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SCOUT_NAV.map(item => (
            <NavItem key={item.id} item={item} active={activeTab === item.id} badge={badges[item.id]} onClick={() => setActiveTab(item.id)} />
          ))}
        </div>
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {/* Theme toggle */}
        <button onClick={toggleTheme}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, marginBottom: 10, transition: 'all 0.15s' }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#42D674'; e.currentTarget.style.color = '#42D674'; }}
          onMouseOut={e =>  { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
          <span>{isDark ? '☀️' : '🌙'}</span>
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>

        {/* Status + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#42D674', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#42D674' }}>API Connected ✓</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{userEmail}</span>
          <button onClick={onLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
            onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseOut={e =>  { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}>
            <LogOut size={13} /> Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
