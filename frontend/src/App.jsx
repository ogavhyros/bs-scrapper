import { useState, useEffect, useCallback } from 'react';
import Sidebar     from './components/Sidebar';
import ScraperTab  from './components/ScraperTab';
import ContactsTab from './components/ContactsTab';
import HistoryTab  from './components/HistoryTab';

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
  scraper:  (s) => ({ title: 'Contact Scraper', sub: `${s.total} contact${s.total !== 1 ? 's' : ''} collected · sorted by completeness`  }),
  contacts: (s) => ({ title: 'All Contacts',    sub: `${s.total} business contact${s.total !== 1 ? 's' : ''} · complete records`          }),
  history:  (s) => ({ title: 'Analytics',       sub: `${s.runs} scrape run${s.runs !== 1 ? 's' : ''} · full history`                      }),
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('scraper');
  const [contacts,  setContacts]  = useState([]);
  const [runs,      setRuns]      = useState([]);

  const fetchContacts = useCallback(async () => {
    try { setContacts(await (await fetch('/api/contacts')).json()); }
    catch (e) { console.error('contacts:', e); }
  }, []);

  const fetchRuns = useCallback(async () => {
    try { setRuns(await (await fetch('/api/runs')).json()); }
    catch (e) { console.error('runs:', e); }
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchRuns();
  }, [fetchContacts, fetchRuns]);

  const refreshData = useCallback(
    () => Promise.all([fetchContacts(), fetchRuns()]),
    [fetchContacts, fetchRuns],
  );

  const stats = {
    total:       contacts.length,
    withPhone:   contacts.filter(c => c.phone).length,
    withWebsite: contacts.filter(c => c.website).length,
    runs:        runs.length,
    critical:    contacts.filter(c => getPriority(c) === 'critical').length,
    high:        contacts.filter(c => getPriority(c) === 'high').length,
    normal:      contacts.filter(c => getPriority(c) === 'normal').length,
  };

  const page = (PAGE_META[activeTab] ?? PAGE_META.scraper)(stats);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalContacts={stats.total}
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
            {activeTab === 'contacts' && <ContactsTab contacts={contacts} onRefresh={refreshData} />}
            {activeTab === 'history'  && <HistoryTab  runs={runs} />}
          </div>
        </main>
      </div>
    </div>
  );
}
