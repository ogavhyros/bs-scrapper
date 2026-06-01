import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth, getAuthHeader } from './context/AuthContext';
import AuthPage      from './pages/AuthPage';
import Sidebar       from './components/Sidebar';
import ScraperTab    from './components/ScraperTab';
import ContactsTab   from './components/ContactsTab';
import HistoryTab    from './components/HistoryTab';
import CRMTab        from './components/CRMTab';
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
  scraper:  (s) => ({ title: 'Contact Scraper', sub: `${s.total} contact${s.total !== 1 ? 's' : ''} collected · sorted by completeness`   }),
  contacts: (s) => ({ title: 'All Contacts',    sub: `${s.total} business contact${s.total !== 1 ? 's' : ''} · complete records`           }),
  history:  (s) => ({ title: 'Analytics',       sub: `${s.runs} scrape run${s.runs !== 1 ? 's' : ''} · full history`                       }),
  crm:      (s) => ({ title: 'CRM Tracker',     sub: `${s.crmTotal} lead${s.crmTotal !== 1 ? 's' : ''} · call tracking & follow-ups`       }),
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

  useEffect(() => {
    if (user) {
      fetchContacts();
      fetchRuns();
      fetchCrm();
    }
  }, [user, fetchContacts, fetchRuns, fetchCrm]);

  const refreshData = useCallback(
    () => Promise.all([fetchContacts(), fetchRuns(), fetchCrm()]),
    [fetchContacts, fetchRuns, fetchCrm],
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
    normal:      contacts.filter(c => getPriority(c) === 'normal').length,
    crmTotal:    crmContacts.length,
  };

  const page = (PAGE_META[activeTab] ?? PAGE_META.scraper)(stats);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalContacts={stats.total}
        crmCount={stats.crmTotal}
        userEmail={user.email}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-panel border-b border-line flex items-center px-8 flex-shrink-0">
          <p className="text-sm text-ink-soft">
            Welcome back!{' '}
            <span className="text-ink font-medium">Here's what your scraper has collected.</span>
          </p>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-8 pt-7 pb-2">
            <h1 className="text-3xl font-bold text-ink leading-tight">{page.title}</h1>
            <p className="text-sm text-ink-soft mt-1">{page.sub}</p>
          </div>

          <div className="px-8 pb-8 pt-5">
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
          </div>
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ── Root: wraps everything in AuthProvider ────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
