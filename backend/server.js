require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const axios    = require('axios');
const ExcelJS  = require('exceljs');
const db       = require('./db');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

// ─── POST /api/scrape ────────────────────────────────────────────────────────
// Streams progress via SSE then sends a final "result" event.
app.post('/api/scrape', async (req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const { keyword, location, radius } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY is not set in the server environment.' });
  }
  if (!keyword || !location) {
    return res.status(400).json({ error: 'Keyword and location are required.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const allPlaces = [];
    let pageToken   = null;
    let pageNum     = 0;

    // ── Paginate up to 5 pages (max 100 results) ──────────────────────────────
    while (pageNum < 5) {
      send({ type: 'progress', message: `Fetching page ${pageNum + 1}…` });

      const params = { key: apiKey };
      if (pageNum === 0) {
        params.query  = `${keyword} in ${location}`;
        params.radius = radius || 5000;
      } else {
        params.pagetoken = pageToken;
      }

      const searchRes = await axios.get(`${PLACES_BASE}/textsearch/json`, {
        params, timeout: 15000,
      });

      const { status, results = [], next_page_token, error_message } = searchRes.data;

      if (pageNum === 0) {
        if (status === 'REQUEST_DENIED' || status === 'INVALID_REQUEST') {
          send({ type: 'error', message: `Google API: ${status} — ${error_message || 'Check your API key and enabled APIs.'}` });
          return res.end();
        }
        if (status === 'ZERO_RESULTS') {
          send({ type: 'result', results: [], count: 0 });
          return res.end();
        }
        if (status !== 'OK') {
          send({ type: 'error', message: `Google Places: ${status}` });
          return res.end();
        }
      } else if (status !== 'OK') {
        break;
      }

      allPlaces.push(...results);
      pageNum++;

      if (!next_page_token) break;
      pageToken = next_page_token;

      // Google requires ~2 s before the next_page_token becomes valid
      await new Promise(r => setTimeout(r, 2000));
    }

    // ── Enrich with Place Details in parallel batches of 5 ────────────────────
    const today        = new Date().toISOString().split('T')[0];
    const enriched     = [];
    const BATCH        = 5;
    const totalBatches = Math.ceil(allPlaces.length / BATCH);

    for (let i = 0; i < allPlaces.length; i += BATCH) {
      const batchNum = Math.floor(i / BATCH) + 1;
      send({ type: 'progress', message: `Fetching details… batch ${batchNum} of ${totalBatches}` });

      const batch   = allPlaces.slice(i, i + BATCH);
      const details = await Promise.all(batch.map(async place => {
        try {
          const dr = await axios.get(`${PLACES_BASE}/details/json`, {
            params: {
              place_id: place.place_id,
              fields: 'place_id,name,formatted_phone_number,website,formatted_address,rating,types,geometry',
              key: apiKey,
            },
            timeout: 10000,
          });
          if (dr.data.status !== 'OK') return null;
          const d = dr.data.result;
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
        } catch (e) {
          console.warn(`Details failed for ${place.place_id}:`, e.message);
          return null;
        }
      }));

      enriched.push(...details.filter(Boolean));
    }

    send({ type: 'result', results: enriched, count: enriched.length });
    res.end();
  } catch (err) {
    console.error('Scrape error:', err.message);
    send({ type: 'error', message: 'Scrape failed: ' + err.message });
    res.end();
  }
});

// ─── GET /api/contacts ───────────────────────────────────────────────────────
app.get('/api/contacts', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/contacts ──────────────────────────────────────────────────────
app.post('/api/contacts', (req, res) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.json({ added: 0, skipped: 0 });
  }

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
        c.keyword_searched, c.location_searched, c.scraped_date
      );
      if (info.changes > 0) added++;
      else skipped++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: err.message });
  }

  res.json({ added, skipped });
});

// ─── GET /api/runs ───────────────────────────────────────────────────────────
app.get('/api/runs', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM runs ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/runs ──────────────────────────────────────────────────────────
app.post('/api/runs', (req, res) => {
  const { keyword, location, date, added, skipped, total } = req.body;
  try {
    const info = db.prepare(
      'INSERT INTO runs (keyword, location, date, added, skipped, total) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(keyword, location, date, added ?? 0, skipped ?? 0, total ?? 0);
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/export ─────────────────────────────────────────────────────────
app.get('/api/export', async (_req, res) => {
  try {
    const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();

    const wb = new ExcelJS.Workbook();

    // ── Sheet 1: Business Contacts (clean, user-facing columns) ──────────────
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
    contacts.forEach((c, i) => {
      ws1.addRow({
        num:      i + 1,
        name:     c.name    || '',
        phone:    c.phone   || '',
        website:  c.website || '',
        address:  c.address || '',
        rating:   c.rating  ?? '',
        category: c.types ? c.types.split(',')[0].replace(/_/g, ' ') : '',
      });
    });

    // ── Sheet 2: CRM Tracker ──────────────────────────────────────────────────
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

    // Header row: bold, green bg, white text
    ws2.getRow(1).eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Freeze top row
    ws2.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }];

    // Auto-filter on header row
    ws2.autoFilter = { from: 'A1', to: 'J1' };

    // Data rows: alternating white / light gray, default "❌ Not Called"
    contacts.forEach((c, i) => {
      const row       = ws2.addRow({
        num:      i + 1,
        name:     c.name  || '',
        phone:    c.phone || '',
        called:   '❌ Not Called',
        callDate: '',
        contact:  '',
        outcome:  '',
        notes:    '',
        action:   '',
        priority: '',
      });
      const fillArgb = i % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
        cell.alignment = { vertical: 'middle' };
      });
    });

    // Dropdown data validations
    const dvLast = Math.max(contacts.length + 1, 2);
    ws2.dataValidations.add(`D2:D${dvLast}`, {
      type: 'list', allowBlank: true, showErrorMessage: false,
      formulae: ['"✅ Called,❌ Not Called,🔄 Follow Up"'],
    });
    ws2.dataValidations.add(`G2:G${dvLast}`, {
      type: 'list', allowBlank: true, showErrorMessage: false,
      formulae: ['"Interested,Not Interested,No Answer,Voicemail,Wrong Number"'],
    });
    ws2.dataValidations.add(`I2:I${dvLast}`, {
      type: 'list', allowBlank: true, showErrorMessage: false,
      formulae: ['"Send Proposal,Call Again,Remove,Converted"'],
    });
    ws2.dataValidations.add(`J2:J${dvLast}`, {
      type: 'list', allowBlank: true, showErrorMessage: false,
      formulae: ['"Hot,Warm,Cold"'],
    });

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
app.delete('/api/clear', (_req, res) => {
  try {
    db.exec('DELETE FROM contacts');
    db.exec('DELETE FROM runs');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CRM ROUTES ──────────────────────────────────────────────────────────────

const ALLOWED_CRM_FIELDS = new Set([
  'status', 'call_date', 'contact_person', 'outcome',
  'notes', 'next_action', 'priority',
]);

// GET /api/crm/stats
app.get('/api/crm/stats', (_req, res) => {
  try {
    const rows  = db.prepare('SELECT status, COUNT(*) as count FROM crm_contacts GROUP BY status').all();
    const total = db.prepare('SELECT COUNT(*) as count FROM crm_contacts').get()?.count ?? 0;
    const keyMap = {
      'Not Called':     'notCalled',
      'Called':         'called',
      'Follow Up':      'followUp',
      'Converted':      'converted',
      'Interested':     'interested',
      'Not Interested': 'notInterested',
    };
    const counts = { total, notCalled: 0, called: 0, followUp: 0, converted: 0, interested: 0, notInterested: 0 };
    for (const r of rows) { const k = keyMap[r.status]; if (k) counts[k] = r.count; }
    res.json(counts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/crm
app.get('/api/crm', (_req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM crm_contacts ORDER BY moved_at DESC').all());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/crm/add
app.post('/api/crm/add', (req, res) => {
  const { place_ids } = req.body;
  if (!Array.isArray(place_ids) || place_ids.length === 0) return res.json({ added: 0, skipped: 0 });

  let added = 0, skipped = 0;
  const select = db.prepare('SELECT * FROM contacts WHERE place_id = ?');
  const insert = db.prepare(`
    INSERT OR IGNORE INTO crm_contacts
      (contact_id, place_id, name, phone, website, address, rating, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (const pid of place_ids) {
      const c = select.get(pid);
      if (!c) { skipped++; continue; }
      const info = insert.run(
        c.id, c.place_id, c.name, c.phone, c.website, c.address,
        c.rating != null ? String(c.rating) : null,
        c.types ? c.types.split(',')[0].replace(/_/g, ' ') : null,
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

// PATCH /api/crm/:place_id
app.patch('/api/crm/:place_id', (req, res) => {
  const { place_id } = req.params;
  const fields = Object.keys(req.body).filter(k => ALLOWED_CRM_FIELDS.has(k));
  if (fields.length === 0) return res.json({ updated: 0 });

  const setClauses = [...fields.map(f => `${f} = ?`), "updated_at = datetime('now')"].join(', ');
  try {
    const info = db.prepare(`UPDATE crm_contacts SET ${setClauses} WHERE place_id = ?`)
      .run(...fields.map(f => req.body[f]), place_id);
    res.json({ updated: info.changes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/crm/:place_id
app.delete('/api/crm/:place_id', (req, res) => {
  const { place_id } = req.params;
  try {
    const info = db.prepare('DELETE FROM crm_contacts WHERE place_id = ?').run(place_id);
    res.json({ deleted: info.changes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  Business Scout API  →  http://localhost:${PORT}\n`);
});
