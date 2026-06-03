import { LayoutGrid, ShoppingBasket, Search, Phone, BarChart2 } from 'lucide-react';
import LinkedInIcon from './LinkedInIcon';

const ITEMS = [
  { id: 'scraper',  icon: LayoutGrid,     label: 'Home'      },
  { id: 'contacts', icon: ShoppingBasket, label: 'Contacts'  },
  { id: 'scraper',  icon: Search,         label: 'Scraper'   },
  { id: 'crm',      icon: Phone,          label: 'CRM'       },
  { id: 'linkedin', icon: LinkedInIcon,   label: 'LinkedIn', activeColor: '#0077b5' },
  { id: 'history',  icon: BarChart2,      label: 'Analytics' },
];

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-line flex lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map((item, i) => {
        const Icon        = item.icon;
        const isActive    = activeTab === item.id;
        const activeColor = item.activeColor || '#42D674';
        const color       = isActive ? activeColor : '#9ca3af';
        return (
          <button
            key={i}
            onClick={() => setActiveTab(item.id)}
            className="flex-1 flex flex-col items-center justify-center py-2 transition-colors"
            style={{ minHeight: '56px' }}
          >
            <Icon size={20} style={{ color }} />
            <span className="text-[9px] font-medium mt-0.5" style={{ color }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
