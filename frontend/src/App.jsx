import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider }                           from './context/ThemeContext';
import { AuthProvider, useAuth, getAuthHeader }  from './context/AuthContext';
import { useToast, ToastContainer }              from './components/Toast';
import AuthPage    from './pages/AuthPage';
import Sidebar     from './components/Sidebar';
import BottomNav   from './components/BottomNav';
// APHL Africa
import OverviewTab from './components/aphl/OverviewTab';
import SalesTab    from './components/aphl/SalesTab';
import ExpenseTab      from './components/aphl/ExpenseTab';
import RateCalculator    from './components/aphl/RateCalculator';
import InvoiceGenerator from './components/aphl/InvoiceGenerator';
// Business Scout
import ScraperTab  from './components/ScraperTab';
import ContactsTab from './components/ContactsTab';
import HistoryTab  from './components/HistoryTab';
import CRMTab      from './components/CRMTab';
import LinkedInTab from './components/LinkedInTab';

const API = import.meta.env.VITE_API_URL ?? '';

// ── Priority classifier (shared across tabs) ──────────────────────────────────
export function getPriority(contact) {
  const p = Boolean(contact.phone);
  const w = Boolean(contact.website);
  if (!p && !w) return 'critical';
  if (p  && w)  return 'normal';
  return 'high';
}

// ── Page titles ───────────────────────────────────────────────────────────────
const PAGE_META = {
  overview:  () => ({ title: 'Overview',          sub: 'APHL Africa dashboard — revenue, expenses & performance' }),
  sales:     () => ({ title: 'Sales Logger',       sub: 'Log and track all fuel sales and deliveries' }),
  expenses:   () => ({ title: 'Expense Logger',   sub: 'Track all operational costs and expenses' }),
  calculator: () => ({ title: 'Rate Calculator',   sub: 'Calculate minimum viable haulage rate for any trip' }),
  invoices:   () => ({ title: 'Invoice Generator', sub: 'Create and manage professional invoices' }),
  scraper:   (s) => ({ title: 'Contact Scraper',   sub: `${s.total} contact${s.total !== 1 ? 's' : ''} collected · up to 100 per search` }),
  contacts:  (s) => ({ title: 'All Contacts',      sub: `${s.total} business contact${s.total !== 1 ? 's' : ''} · complete records` }),
  analytics: (s) => ({ title: 'Analytics',         sub: `${s.runs} scrape run${s.runs !== 1 ? 's' : ''} · full history` }),
  crm:       (s) => ({ title: 'CRM Tracker',       sub: `${s.crmTotal} lead${s.crmTotal !== 1 ? 's' : ''} · call tracking & follow-ups` }),
  linkedin:  (s) => ({ title: 'LinkedIn Scraper',  sub: `${s.linkedinTotal} profile${s.linkedinTotal !== 1 ? 's' : ''} · NinjaPear employee search` }),
};

// ── Loading spinner ───────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-ink-muted">Loading…</p>
      </div>
    </div>
  );
}

// ── Main app ─────────────────────────────────────────────────────────────────
function AppContent() {
  const { user, isLoading, logout } = useAuth();
  const [activeTab,        setActiveTab]        = useState('overview');
  const [contacts,         setContacts]         = useState([]);
  const [runs,             setRuns]             = useState([]);
  const [crmContacts,      setCrmContacts]      = useState([]);
  const [linkedinContacts, setLinkedinContacts] = useState([]);
  const { toasts, showToast } = useToast();

  const fetchContacts = useCallback(async () => {
    try { setContacts(await (await fetch(`${API}/api/contacts`, { headers: getAuthHeader() })).json()); }
    catch (e) { console.error('contacts:', e); }
  }, []);
  const fetchRuns = useCallback(async () => {
    try { setRuns(await (await fetch(`${API}/api/runs`, { headers: getAuthHeader() })).json()); }
    catch (e) { console.error('runs:', e); }
  }, []);
  const fetchCrm = useCallback(async () => {
    try { setCrmContacts(await (await fetch(`${API}/api/crm`, { headers: getAuthHeader() })).json()); }
    catch (e) { console.error('crm:', e); }
  }, []);
  const fetchLinkedin = useCallback(async () => {
    try { setLinkedinContacts(await (await fetch(`${API}/api/linkedin/contacts`, { headers: getAuthHeader() })).json()); }
    catch (e) { console.error('linkedin:', e); }
  }, []);

  useEffect(() => {
    if (user) { fetchContacts(); fetchRuns(); fetchCrm(); fetchLinkedin(); }
  }, [user, fetchContacts, fetchRuns, fetchCrm, fetchLinkedin]);

  const refreshData = useCallback(
    () => Promise.all([fetchContacts(), fetchRuns(), fetchCrm(), fetchLinkedin()]),
    [fetchContacts, fetchRuns, fetchCrm, fetchLinkedin],
  );

  if (isLoading) return <LoadingSpinner />;
  if (!user)     return <AuthPage />;

  const crmPlaceIds = new Set(crmContacts.map(c => c.place_id));
  const stats = {
    total:        contacts.length,
    runs:         runs.length,
    critical:     contacts.filter(c => getPriority(c) === 'critical').length,
    high:         contacts.filter(c => getPriority(c) === 'high').length,
    normal:       contacts.filter(c => getPriority(c) === 'normal').length,
    crmTotal:     crmContacts.length,
    linkedinTotal:linkedinContacts.length,
  };

  const pageFn = PAGE_META[activeTab] ?? PAGE_META.overview;
  const page   = pageFn(stats);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">

      {/* Sidebar — desktop */}
      <Sidebar
        activeTab={activeTab} setActiveTab={setActiveTab}
        totalContacts={stats.total} crmCount={stats.crmTotal}
        linkedinCount={stats.linkedinTotal} userEmail={user.email}
        onLogout={logout}
      />

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="flex-shrink-0 h-14 bg-panel border-b border-line flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <div style={{ width: 28, height: 28, background: '#42D674', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📍</div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#42D674', letterSpacing: '-0.3px' }}>APHL Africa</span>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-ink leading-tight">{page.title}</h1>
            <p className="text-xs text-ink-soft mt-0.5">{page.sub}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0 lg:hidden">
            {user.email[0].toUpperCase()}
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
          <div className="px-4 lg:px-8 pb-28 lg:pb-8 pt-5 lg:pt-6">
            {activeTab === 'overview'  && <OverviewTab  onNavigate={setActiveTab} />}
            {activeTab === 'sales'     && <SalesTab     showToast={showToast} />}
            {activeTab === 'expenses'   && <ExpenseTab     showToast={showToast} />}
            {activeTab === 'calculator' && <RateCalculator    showToast={showToast} />}
            {activeTab === 'invoices'   && <InvoiceGenerator showToast={showToast} />}
            {activeTab === 'scraper'   && <ScraperTab   stats={stats} onRefresh={refreshData} />}
            {activeTab === 'contacts'  && (
              <ContactsTab contacts={contacts} onRefresh={refreshData} crmPlaceIds={crmPlaceIds} showToast={showToast} />
            )}
            {activeTab === 'analytics' && <HistoryTab   runs={runs} />}
            {activeTab === 'crm'       && (
              <CRMTab crmContacts={crmContacts} onRefresh={refreshData} showToast={showToast} />
            )}
            {activeTab === 'linkedin'  && (
              <LinkedInTab linkedinContacts={linkedinContacts} onRefresh={refreshData} showToast={showToast} />
            )}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
