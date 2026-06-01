import {
  LayoutGrid, ShoppingBasket, Table2, UtensilsCrossed,
  Layers, CalendarDays, Search,
} from 'lucide-react';

// ── Nav configuration ────────────────────────────────────────────────────────

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

// ── Sub-item ─────────────────────────────────────────────────────────────────

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

function NavItem({ icon: Icon, label, active, badge, onClick, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`nav-item ${
        active
          ? 'bg-nav-active text-ink font-semibold'
          : disabled
          ? 'text-ink-ghost cursor-default'
          : 'text-ink-soft hover:bg-nav-hover hover:text-ink'
      }`}
    >
      {Icon && (
        <Icon
          size={18}
          className={`flex-shrink-0 transition-colors ${
            active ? 'text-ink' : disabled ? 'text-ink-ghost' : 'text-ink-muted'
          }`}
        />
      )}
      <span className="flex-1 text-left leading-none">{label}</span>
      {badge != null && badge > 0 && (
        <span className="px-2 py-0.5 bg-brand text-white text-[11px] font-bold rounded-full min-w-[22px] text-center leading-none py-1">
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar({ activeTab, setActiveTab, totalContacts }) {
  const ordersOpen = ['scraper', 'contacts', 'history'].includes(activeTab);

  return (
    <aside className="w-sidebar min-w-sidebar h-screen bg-panel border-r border-line
                      flex flex-col flex-shrink-0 overflow-hidden">

      {/* Logo ──────────────────────────────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-line flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand rounded-nav flex items-center justify-center flex-shrink-0">
            <Search size={15} className="text-white" />
          </div>
          <span className="text-[20px] font-extrabold text-brand tracking-tight leading-none">
            Business Scout
          </span>
        </div>
      </div>

      {/* Navigation ────────────────────────────────────────────────────────── */}
      <nav className="px-3 py-3 flex-1 overflow-y-auto space-y-0.5">

        {/* Dashboard */}
        <NavItem
          icon={LayoutGrid}
          label="Dashboard"
          active={false}
          onClick={() => setActiveTab('scraper')}
        />

        {/* Contacts section */}
        <div>
          <NavItem
            icon={ShoppingBasket}
            label="Contacts"
            active={ordersOpen}
            badge={totalContacts}
            onClick={() => {}} /* expand only — sub-items handle routing */
          />

          {/* Sub-nav items */}
          <div className="mt-0.5 space-y-0.5">
            {FUNCTIONAL_SUB.map(sub => (
              <SubItem
                key={sub.id}
                label={sub.label}
                active={activeTab === sub.id}
                onClick={() => setActiveTab(sub.id)}
              />
            ))}
          </div>
        </div>

        {/* Decorative nav items */}
        <div className="pt-1">
          {DECORATIVE_NAV.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={false}
              disabled
            />
          ))}
        </div>
      </nav>

      {/* Footer ────────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-line flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0 animate-pulse" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-brand truncate">API Connected ✓</p>
            <p className="text-[10px] text-ink-muted">Business Scout v1.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
