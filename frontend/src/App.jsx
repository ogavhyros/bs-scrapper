import { useState, useEffect, useCallback } from 'react';
import Sidebar     from './components/Sidebar';
import ScraperTab  from './components/ScraperTab';
import ContactsTab from './components/ContactsTab';
import HistoryTab  from './components/HistoryTab';
import CRMTab      from './components/CRMTab';
import { useToast, ToastContainer } from './components/Toast';

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

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab,   setActiveTab]   = useState('scraper');
  const [contacts,    setContacts]    = useState([]);
  const [runs,        setRuns]        = useState([]);
  const [crmContacts, setCrmContacts] = useState([]);

  const { toasts, showToast } = useToast();

  const fetchContacts = useCallback(async () => {
    try { setContacts(await (await fetch('/api/contacts')).json()); }
    catch (e) { console.error('contacts:', e); }
  }, []);

  const fetchRuns = useCallback(async () => {
    try { setRuns(await (await fetch('/api/runs')).json()); }
    catch (e) { console.error('runs:', e); }
  }, []);

  const fetchCrm = useCallback(async () => {
    try { setCrmContacts(await (await fetch('/api/crm')).json()); }
    catch (e) { console.error('crm:', e); }
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchRuns();
    fetchCrm();
  }, [fetchContacts, fetchRuns, fetchCrm]);

  const refreshData = useCallback(
    () => Promise.all([fetchContacts(), fetchRuns(), fetchCrm()]),
    [fetchContacts, fetchRuns, fetchCrm],
  );

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

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalContacts={stats.total}
        crmCount={stats.crmTotal}
      />

      {/* ── Content shell ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-panel border-b border-line flex items-center px-8 flex-shrink-0">
          <p className="text-sm text-ink-soft">
            Welcome back!{' '}
            <span className="text-ink font-medium">Here's what your scraper has collected.</span>
          </p>
        </header>

        {/* Scrollable page */}
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
