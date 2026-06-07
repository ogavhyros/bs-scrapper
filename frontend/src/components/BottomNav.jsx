import { Home, TrendingUp, Receipt, Users, Phone } from 'lucide-react';

const ITEMS = [
  { id: 'overview',  icon: Home,        label: 'Overview', color: '#f59e0b' },
  { id: 'sales',     icon: TrendingUp,  label: 'Sales',    color: '#42D674' },
  { id: 'expenses',  icon: Receipt,     label: 'Expenses', color: '#ef4444' },
  { id: 'contacts',  icon: Users,       label: 'Contacts', color: '#42D674' },
  { id: 'crm',       icon: Phone,       label: 'CRM',      color: '#42D674' },
];

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t flex lg:hidden"
      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map((item) => {
        const Icon     = item.icon;
        const isActive = activeTab === item.id;
        const color    = isActive ? item.color : 'var(--text-muted)';
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex-1 flex flex-col items-center justify-center py-2 transition-colors"
            style={{ minHeight: 56, background: isActive ? `${item.color}12` : 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Icon size={20} style={{ color }} />
            <span style={{ fontSize: 9, fontWeight: 600, marginTop: 2, color }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
