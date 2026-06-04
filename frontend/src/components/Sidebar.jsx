import {
  LayoutGrid, ShoppingBasket, Table2, UtensilsCrossed,
  Layers, CalendarDays, Phone, LogOut,
} from 'lucide-react';
import LinkedInIcon from './LinkedInIcon';
import { useTheme } from '../context/ThemeContext';

// ── Nav configuration ─────────────────────────────────────────────────────────

const FUNCTIONAL_SUB = [
  { id: 'contacts', label: 'All Contacts' },
  { id: 'scraper',  label: 'Scraper'      },
  { id: 'history',  label: 'Analytics'   },
];

const DECORATIVE_NAV = [
  { id: 'tables',       label: 'Campaigns',    icon: Table2          },
  { id: 'menu',         label: 'Keywords',     icon: UtensilsCrossed },
  { id: 'inventory',    label: 'Data Sources', icon: Layers          },
  { id: 'reservations', label: 'Schedule',     icon: CalendarDays    },
];

// ── Sub-item ──────────────────────────────────────────────────────────────────

function SubItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`nav-item pl-[44px] pr-3 py-2 text-[13px] ${
        active
          ? 'text-ink font-bold'
          : 'text-ink-muted hover:text-ink-soft'
      }`}
    >
      {label}
    </button>
  );
}

// ── Top-level nav item ────────────────────────────────────────────────────────

function NavItem({ icon: Icon, label, active, badge, onClick, disabled, iconColor, badgeColor }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`nav-item ${
        active
          ? 'bg-nav-active text-brand-dark font-semibold shadow-[inset_3px_0_0_#42D674]'
          : disabled
          ? 'text-ink-ghost cursor-default'
          : 'text-ink-soft hover:bg-nav-hover hover:text-ink'
      }`}
    >
      {Icon && (
        <Icon
          size={18}
          style={iconColor ? { color: iconColor } : undefined}
          className={`flex-shrink-0 transition-colors ${
            iconColor ? '' : active ? 'text-ink' : disabled ? 'text-ink-ghost' : 'text-ink-muted'
          }`}
        />
      )}
      <span className="flex-1 text-left leading-none">{label}</span>
      {badge != null && badge > 0 && (
        <span
          className="px-2 py-0.5 text-white text-[11px] font-bold rounded-full min-w-[22px] text-center leading-none py-1"
          style={{ backgroundColor: badgeColor || '#42D674' }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar({ activeTab, setActiveTab, totalContacts, crmCount, linkedinCount, userEmail, onLogout }) {
  const ordersOpen = ['scraper', 'contacts', 'history'].includes(activeTab);
  const { isDark, toggleTheme } = useTheme();

  return (
    <aside className="hidden lg:flex w-sidebar min-w-sidebar h-screen bg-panel border-r border-line
                      flex-col flex-shrink-0 overflow-hidden">

      {/* Logo ──────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#42D674', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(66,214,116,0.3)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="10" r="5" fill="white"/>
            <circle cx="12" cy="10" r="3" fill="#42D674"/>
            <circle cx="12" cy="10" r="1.3" fill="white"/>
            <path d="M12 15 L12 21" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M8 19 L12 21 L16 19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.15, color: 'var(--text-primary)' }}>Business</div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.15, color: '#42D674' }}>Scout</div>
        </div>
      </div>

      {/* Navigation ────────────────────────────────────────────────────────── */}
      <nav className="px-3 py-3 flex-1 overflow-y-auto space-y-0.5">

        <NavItem icon={LayoutGrid} label="Dashboard" active={false} onClick={() => setActiveTab('scraper')} />

        <div>
          <NavItem icon={ShoppingBasket} label="Contacts" active={ordersOpen} badge={totalContacts} onClick={() => {}} />
          <div className="mt-0.5 space-y-0.5">
            {FUNCTIONAL_SUB.map(sub => (
              <SubItem key={sub.id} label={sub.label} active={activeTab === sub.id} onClick={() => setActiveTab(sub.id)} />
            ))}
          </div>
        </div>

        <NavItem icon={Phone} label="CRM" active={activeTab === 'crm'} badge={crmCount} onClick={() => setActiveTab('crm')} />

        <NavItem
          icon={LinkedInIcon} label="LinkedIn"
          active={activeTab === 'linkedin'} badge={linkedinCount}
          badgeColor="#0077b5" iconColor="#0077b5"
          onClick={() => setActiveTab('linkedin')}
        />

        <div className="pt-1">
          {DECORATIVE_NAV.map(item => (
            <NavItem key={item.id} icon={item.icon} label={item.label} active={false} disabled />
          ))}
        </div>
      </nav>

      {/* Footer ────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-t border-line flex-shrink-0">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '9px 12px', background: 'none',
            border: '1px solid var(--border)', borderRadius: 8,
            cursor: 'pointer', color: 'var(--text-secondary)',
            fontSize: 13, fontWeight: 500, marginBottom: 12,
            transition: 'all 0.2s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#42D674'; e.currentTarget.style.color = '#42D674'; }}
          onMouseOut={e =>  { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <span style={{ fontSize: 15 }}>{isDark ? '☀️' : '🌙'}</span>
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>

        <div className="flex items-center gap-2 mb-2.5">
          <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0 animate-pulse" />
          <p className="text-[11px] font-semibold text-brand">API Connected ✓</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-ink-muted truncate flex-1 min-w-0">{userEmail}</p>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-[12px] text-ink-muted hover:text-red-500
                       hover:bg-red-50 px-2 py-1 rounded-nav transition-colors flex-shrink-0"
            title="Logout"
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
