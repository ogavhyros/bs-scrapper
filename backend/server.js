require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const ExcelJS  = require('exceljs');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('./db');

const app = express();
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));
app.use(express.json());

// Allow up to 2 minutes for long scrape operations
app.use((req, res, next) => {
  res.setTimeout(120000);
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });
    const hash = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email.toLowerCase(), hash);
    res.json({ success: true, message: 'Account created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email, message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (_req, res) => res.json({ success: true }));

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email });
});

// ─── POST /api/scrape ────────────────────────────────────────────────────────
// Paginates up to 5 pages (100 results), enriches with Place Details,
// saves to DB, logs the run — all in one SSE stream.
app.post('/api/scrape', requireAuth, async (req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const { keyword, location, radius } = req.body;

  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY is not set.' });
  if (!keyword || !location) return res.status(400).json({ error: 'Keyword and location are required.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send         = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const sendProgress = (msg)  => send({ type: 'progress', message: msg });

  try {
    // ── 1. Paginate Google Places Text Search ─────────────────────────────────
    const allPlaces = [];
    let pageToken   = null;
    let pageCount   = 0;
    const maxPages  = 5;

    do {
      sendProgress(`Fetching page ${pageCount + 1} of up to ${maxPages}…`);

      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json` +
                `?query=${encodeURIComponent(keyword + ' in ' + location)}` +
                `&radius=${radius || 5000}&key=${apiKey}`;
      if (pageToken) url += `&pagetoken=${pageToken}`;

      const response = await fetch(url);
      const data     = await response.json();

      if (data.status === 'REQUEST_DENIED' || data.status === 'INVALID_REQUEST') {
        send({ type: 'error', message: `Google API: ${data.status} — ${data.error_message || 'Check your API key.'}` });
        return res.end();
      }
      if (data.status === 'ZERO_RESULTS') break;

      if (data.results?.length > 0) allPlaces.push(...data.results);

      pageToken = data.next_page_token || null;
      pageCount++;

      // Google requires ~2 s before next_page_token becomes valid
      if (pageToken && pageCount < maxPages) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } while (pageToken && pageCount < maxPages);

    if (allPlaces.length === 0) {
      send({ type: 'result', total_found: 0, new_added: 0, skipped: 0, pages_fetched: pageCount });
      return res.end();
    }

    // ── 2. Fetch Place Details in batches of 5 ────────────────────────────────
    sendProgress(`Getting contact details for ${allPlaces.length} businesses…`);

    const today    = new Date().toISOString().split('T')[0];
    const enriched = [];
    const BATCH    = 5;

    for (let i = 0; i < allPlaces.length; i += BATCH) {
      const batch        = allPlaces.slice(i, i + BATCH);
      const batchResults = await Promise.all(batch.map(async place => {
        try {
          const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json` +
                            `?place_id=${place.place_id}` +
                            `&fields=place_id,name,formatted_address,formatted_phone_number,website,rating,types,geometry` +
                            `&key=${apiKey}`;
          const r    = await fetch(detailUrl);
          const body = await r.json();
          if (body.status !== 'OK' || !body.result) return null;
          const d = body.result;
          return {
            place_id:          d.place_id,
            name:              d.name              || place.name              || null,
            phone:             d.formatted_phone_number                       || null,
            website:           d.website                                      || null,
            address:           d.formatted_address || place.formatted_address || null,
            rating:            d.rating            ?? place.rating            ?? null,
            types:             (d.types || place.types || []).join(','),
            lat:               d.geometry?.location?.lat ?? place.geometry?.location?.lat ?? null,
            lng:               d.geometry?.location?.lng ?? place.geometry?.location?.lng ?? null,
            keyword_searched:  keyword,
            location_searched: location,
            scraped_date:      today,
          };
        } catch { return null; }
      }));
      enriched.push(...batchResults.filter(Boolean));

      // Small delay between detail batches to stay under rate limits
      if (i + BATCH < allPlaces.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // ── 3. Deduplicate and save ───────────────────────────────────────────────
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO contacts
        (place_id, name, phone, website, address, rating, types, lat, lng,
         keyword_searched, location_searched, scraped_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    let new_added = 0, skipped = 0;
    db.exec('BEGIN');
    try {
      for (const c of enriched) {
        const info = stmt.run(
          c.place_id, c.name, c.phone, c.website, c.address,
          c.rating, c.types, c.lat, c.lng,
          c.keyword_searched, c.location_searched, c.scraped_date,
        );
        if (info.changes > 0) new_added++; else skipped++;
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    // ── 4. Log run ────────────────────────────────────────────────────────────
    db.prepare('INSERT INTO runs (keyword, location, date, added, skipped, total) VALUES (?, ?, ?, ?, ?, ?)')
      .run(keyword, location, today, new_added, skipped, enriched.length);

    sendProgress(`Done! Added ${new_added} new contact${new_added !== 1 ? 's' : ''} from ${allPlaces.length} found.`);
    send({ type: 'result', total_found: allPlaces.length, new_added, skipped, pages_fetched: pageCount });
    res.end();

  } catch (err) {
    console.error('Scrape error:', err.message);
    send({ type: 'error', message: 'Scrape failed: ' + err.message });
    res.end();
  }
});

// ─── GET /api/contacts ───────────────────────────────────────────────────────
app.get('/api/contacts', requireAuth, (_req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/contacts ──────────────────────────────────────────────────────
app.post('/api/contacts', requireAuth, (req, res) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts) || contacts.length === 0) return res.json({ added: 0, skipped: 0 });

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO contacts
      (place_id, name, phone, website, address, rating, types, lat, lng,
       keyword_searched, location_searched, scraped_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let added = 0, skipped = 0;
  db.exec('BEGIN');
  try {
    for (const c of contacts) {
      const info = stmt.run(
        c.place_id, c.name, c.phone, c.website, c.address,
        c.rating, c.types, c.lat, c.lng,
        c.keyword_searched, c.location_searched, c.scraped_date,
      );
      if (info.changes > 0) added++; else skipped++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: err.message });
  }
  res.json({ added, skipped });
});

// ─── GET /api/runs ───────────────────────────────────────────────────────────
app.get('/api/runs', requireAuth, (_req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM runs ORDER BY created_at DESC').all());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/runs ──────────────────────────────────────────────────────────
app.post('/api/runs', requireAuth, (req, res) => {
  const { keyword, location, date, added, skipped, total } = req.body;
  try {
    const info = db.prepare(
      'INSERT INTO runs (keyword, location, date, added, skipped, total) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(keyword, location, date, added ?? 0, skipped ?? 0, total ?? 0);
    res.json({ id: info.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/export ─────────────────────────────────────────────────────────
app.get('/api/export', requireAuth, async (_req, res) => {
  try {
    const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
    const wb  = new ExcelJS.Workbook();
    const ws1 = wb.addWorksheet('Business Contacts');
    ws1.columns = [
      { header: '#',             key: 'num',      width: 4  },
      { header: 'Business Name', key: 'name',     width: 35 },
      { header: 'Phone',         key: 'phone',    width: 20 },
      { header: 'Website',       key: 'website',  width: 35 },
      { header: 'Address',       key: 'address',  width: 45 },
      { header: 'Rating',        key: 'rating',   width: 8  },
      { header: 'Category',      key: 'category', width: 22 },
    ];
    contacts.forEach((c, i) => ws1.addRow({
      num: i + 1, name: c.name || '', phone: c.phone || '',
      website: c.website || '', address: c.address || '',
      rating: c.rating ?? '', category: c.types ? c.types.split(',')[0].replace(/_/g, ' ') : '',
    }));

    const ws2 = wb.addWorksheet('CRM Tracker');
    ws2.columns = [
      { header: '#',              key: 'num',      width: 4  },
      { header: 'Business Name',  key: 'name',     width: 35 },
      { header: 'Phone',          key: 'phone',    width: 20 },
      { header: 'Called?',        key: 'called',   width: 14 },
      { header: 'Call Date',      key: 'callDate', width: 14 },
      { header: 'Contact Person', key: 'contact',  width: 20 },
      { header: 'Outcome',        key: 'outcome',  width: 18 },
      { header: 'Notes',          key: 'notes',    width: 30 },
      { header: 'Next Action',    key: 'action',   width: 18 },
      { header: 'Priority',       key: 'priority', width: 10 },
    ];
    ws2.getRow(1).eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    ws2.views      = [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }];
    ws2.autoFilter = { from: 'A1', to: 'J1' };
    contacts.forEach((c, i) => {
      const row      = ws2.addRow({ num: i + 1, name: c.name || '', phone: c.phone || '', called: '❌ Not Called', callDate: '', contact: '', outcome: '', notes: '', action: '', priority: '' });
      const fillArgb = i % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
        cell.alignment = { vertical: 'middle' };
      });
    });
    const dvLast = Math.max(contacts.length + 1, 2);
    ws2.dataValidations.add(`D2:D${dvLast}`, { type: 'list', allowBlank: true, showErrorMessage: false, formulae: ['"✅ Called,❌ Not Called,🔄 Follow Up"'] });
    ws2.dataValidations.add(`G2:G${dvLast}`, { type: 'list', allowBlank: true, showErrorMessage: false, formulae: ['"Interested,Not Interested,No Answer,Voicemail,Wrong Number"'] });
    ws2.dataValidations.add(`I2:I${dvLast}`, { type: 'list', allowBlank: true, showErrorMessage: false, formulae: ['"Send Proposal,Call Again,Remove,Converted"'] });
    ws2.dataValidations.add(`J2:J${dvLast}`, { type: 'list', allowBlank: true, showErrorMessage: false, formulae: ['"Hot,Warm,Cold"'] });

    const buf     = await wb.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="business_contacts_CRM_${dateStr}.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/clear ───────────────────────────────────────────────────────
app.delete('/api/clear', requireAuth, (_req, res) => {
  try {
    db.exec('DELETE FROM contacts');
    db.exec('DELETE FROM runs');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CRM ROUTES ──────────────────────────────────────────────────────────────

const ALLOWED_CRM_FIELDS = new Set([
  'status', 'call_date', 'contact_person', 'outcome',
  'notes', 'next_action', 'priority',
]);

app.get('/api/crm/stats', requireAuth, (_req, res) => {
  try {
    const rows  = db.prepare('SELECT status, COUNT(*) as count FROM crm_contacts GROUP BY status').all();
    const total = db.prepare('SELECT COUNT(*) as count FROM crm_contacts').get()?.count ?? 0;
    const keyMap = { 'Not Called': 'notCalled', 'Called': 'called', 'Follow Up': 'followUp', 'Converted': 'converted', 'Interested': 'interested', 'Not Interested': 'notInterested' };
    const counts = { total, notCalled: 0, called: 0, followUp: 0, converted: 0, interested: 0, notInterested: 0 };
    for (const r of rows) { const k = keyMap[r.status]; if (k) counts[k] = r.count; }
    res.json(counts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/crm', requireAuth, (_req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM crm_contacts ORDER BY moved_at DESC').all());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/crm/add', requireAuth, (req, res) => {
  const { place_ids } = req.body;
  if (!Array.isArray(place_ids) || place_ids.length === 0) return res.json({ added: 0, skipped: 0 });
  let added = 0, skipped = 0;
  const select = db.prepare('SELECT * FROM contacts WHERE place_id = ?');
  const insert = db.prepare(`INSERT OR IGNORE INTO crm_contacts (contact_id, place_id, name, phone, website, address, rating, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  db.exec('BEGIN');
  try {
    for (const pid of place_ids) {
      const c = select.get(pid);
      if (!c) { skipped++; continue; }
      const info = insert.run(c.id, c.place_id, c.name, c.phone, c.website, c.address, c.rating != null ? String(c.rating) : null, c.types ? c.types.split(',')[0].replace(/_/g, ' ') : null);
      if (info.changes > 0) added++; else skipped++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: err.message });
  }
  res.json({ added, skipped });
});

app.patch('/api/crm/:place_id', requireAuth, (req, res) => {
  const { place_id } = req.params;
  const fields = Object.keys(req.body).filter(k => ALLOWED_CRM_FIELDS.has(k));
  if (fields.length === 0) return res.json({ updated: 0 });
  const setClauses = [...fields.map(f => `${f} = ?`), "updated_at = datetime('now')"].join(', ');
  try {
    const info = db.prepare(`UPDATE crm_contacts SET ${setClauses} WHERE place_id = ?`).run(...fields.map(f => req.body[f]), place_id);
    res.json({ updated: info.changes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/crm/:place_id', requireAuth, (req, res) => {
  const { place_id } = req.params;
  try {
    const info = db.prepare('DELETE FROM crm_contacts WHERE place_id = ?').run(place_id);
    res.json({ deleted: info.changes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`\n  Business Scout API  →  http://localhost:${PORT}\n`));
