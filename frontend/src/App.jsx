import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { AuthProvider, useAuth, getAuthHeader } from './context/AuthContext';
import AuthPage      from './pages/AuthPage';
import Sidebar       from './components/Sidebar';
import BottomNav     from './components/BottomNav';
import ScraperTab    from './components/ScraperTab';
import ContactsTab   from './components/ContactsTab';
import HistoryTab    from './components/HistoryTab';
import CRMTab        from './components/CRMTab';
import LinkedInTab   from './components/LinkedInTab';
import { useToast, ToastContainer } from './components/Toast';

const API = import.meta.env.VITE_API_URL ?? '';

// ── Priority classifier (shared across tabs) ─────────────────────────────────
export function getPriority(contact) {
  const p = Boolean(contact.phone);
  const w = Boolean(contact.website);
  if (!p && !w) return 'critical';
  if (p  && w)  return 'normal';
  return 'high';
}

// ── Page metadata ─────────────────────────────────────────────────────────────
const PAGE_META = {
  scraper:  (s) => ({ title: 'Contact Scraper', sub: `${s.total} contact${s.total !== 1 ? 's' : ''} collected · up to 100 per search (5 pages × 20)`   }),
  contacts: (s) => ({ title: 'All Contacts',    sub: `${s.total} business contact${s.total !== 1 ? 's' : ''} · complete records`                         }),
  history:  (s) => ({ title: 'Analytics',       sub: `${s.runs} scrape run${s.runs !== 1 ? 's' : ''} · full history`                                      }),
  crm:      (s) => ({ title: 'CRM Tracker',     sub: `${s.crmTotal} lead${s.crmTotal !== 1 ? 's' : ''} · call tracking & follow-ups`                      }),
  linkedin: (s) => ({ title: 'LinkedIn Scraper', sub: `${s.linkedinTotal} profile${s.linkedinTotal !== 1 ? 's' : ''} · search by role + location`           }),
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

// ── Main app (rendered only when authenticated) ───────────────────────────────
function AppContent() {
  const { user, isLoading, logout } = useAuth();
  const [activeTab,   setActiveTab]   = useState('scraper');
  const [contacts,    setContacts]    = useState([]);
  const [runs,        setRuns]        = useState([]);
  const [crmContacts, setCrmContacts] = useState([]);
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
    if (user) {
      fetchContacts();
      fetchRuns();
      fetchCrm();
      fetchLinkedin();
    }
  }, [user, fetchContacts, fetchRuns, fetchCrm, fetchLinkedin]);

  const refreshData = useCallback(
    () => Promise.all([fetchContacts(), fetchRuns(), fetchCrm(), fetchLinkedin()]),
    [fetchContacts, fetchRuns, fetchCrm, fetchLinkedin],
  );

  if (isLoading) return <LoadingSpinner />;
  if (!user)     return <AuthPage />;

  const crmPlaceIds = new Set(crmContacts.map(c => c.place_id));

  const stats = {
    total:       contacts.length,
    withPhone:   contacts.filter(c => c.phone).length,
    withWebsite: contacts.filter(c => c.website).length,
    runs:        runs.length,
    critical:    contacts.filter(c => getPriority(c) === 'critical').length,
    high:        contacts.filter(c => getPriority(c) === 'high').length,
    normal:        contacts.filter(c => getPriority(c) === 'normal').length,
    crmTotal:      crmContacts.length,
    linkedinTotal: linkedinContacts.length,
  };

  const page = (PAGE_META[activeTab] ?? PAGE_META.scraper)(stats);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">

      {/* ── Desktop sidebar (hidden on mobile) ───────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalContacts={stats.total}
        crmCount={stats.crmTotal}
        linkedinCount={stats.linkedinTotal}
        userEmail={user.email}
        onLogout={logout}
      />

      {/* ── Content area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header — responsive */}
        <header className="flex-shrink-0 h-14 bg-panel border-b border-line flex items-center justify-between px-4 lg:px-8">
          {/* Mobile: logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 bg-brand rounded-nav flex items-center justify-center">
              <Search size={13} className="text-white" />
            </div>
            <span className="text-[17px] font-extrabold text-brand tracking-tight leading-none">
              Business Scout
            </span>
          </div>
          {/* Desktop: welcome message */}
          <p className="hidden lg:block text-sm text-ink-soft">
            Welcome back!{' '}
            <span className="text-ink font-medium">Here's what your scraper has collected.</span>
          </p>
          {/* Mobile: user avatar */}
          <div
            className="w-8 h-8 rounded-full bg-brand flex items-center justify-center
                       text-white text-sm font-bold flex-shrink-0 lg:hidden"
          >
            {user.email[0].toUpperCase()}
          </div>
        </header>

        {/* Scrollable page content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="px-4 lg:px-8 pt-6 lg:pt-7 pb-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-ink leading-tight">{page.title}</h1>
            <p className="text-sm text-ink-soft mt-1">{page.sub}</p>
          </div>

          {/* Tab content — extra bottom padding on mobile for bottom nav */}
          <div className="px-4 lg:px-8 pb-28 lg:pb-8 pt-4 lg:pt-5">
            {activeTab === 'scraper'  && <ScraperTab  stats={stats} onRefresh={refreshData} />}
            {activeTab === 'contacts' && (
              <ContactsTab
                contacts={contacts}
                onRefresh={refreshData}
                crmPlaceIds={crmPlaceIds}
                showToast={showToast}
              />
            )}
            {activeTab === 'history'  && <HistoryTab  runs={runs} />}
            {activeTab === 'crm'      && (
              <CRMTab
                crmContacts={crmContacts}
                onRefresh={refreshData}
                showToast={showToast}
              />
            )}
            {activeTab === 'linkedin' && (
              <LinkedInTab
                linkedinContacts={linkedinContacts}
                onRefresh={refreshData}
                showToast={showToast}
              />
            )}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav (hidden on desktop) ────────────────────────── */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
