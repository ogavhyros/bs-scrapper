require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const XLSX    = require('xlsx');
const db      = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

// ─── POST /api/scrape ────────────────────────────────────────────────────────
app.post('/api/scrape', async (req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const { keyword, location, radius } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY is not set in the server environment.' });
  }
  if (!keyword || !location) {
    return res.status(400).json({ error: 'Keyword and location are required.' });
  }

  try {
    const searchRes = await axios.get(`${PLACES_BASE}/textsearch/json`, {
      params: { query: `${keyword} in ${location}`, radius: radius || 5000, key: apiKey },
      timeout: 15000,
    });

    const { status, results = [], error_message } = searchRes.data;

    if (status === 'REQUEST_DENIED' || status === 'INVALID_REQUEST') {
      return res.status(400).json({
        error: `Google API: ${status} — ${error_message || 'Check your API key and enabled APIs.'}`,
      });
    }
    if (status === 'ZERO_RESULTS') return res.json({ results: [], count: 0 });
    if (status !== 'OK') return res.status(400).json({ error: `Google Places: ${status}` });

    const today = new Date().toISOString().split('T')[0];
    const enriched = [];

    for (const place of results.slice(0, 10)) {
      try {
        const detailRes = await axios.get(`${PLACES_BASE}/details/json`, {
          params: {
            place_id: place.place_id,
            fields: 'place_id,name,formatted_phone_number,website,formatted_address,rating,types,geometry',
            key: apiKey,
          },
          timeout: 10000,
        });

        if (detailRes.data.status === 'OK') {
          const d = detailRes.data.result;
          enriched.push({
            place_id:          d.place_id,
            name:              d.name              || place.name              || null,
            phone:             d.formatted_phone_number                       || null,
            website:           d.website                                      || null,
            address:           d.formatted_address || place.formatted_address || null,
            rating:            d.rating            ?? place.rating            ?? null,
            types:             (d.types || place.types || []).join(','),
            lat:               d.geometry?.location?.lat  ?? place.geometry?.location?.lat  ?? null,
            lng:               d.geometry?.location?.lng  ?? place.geometry?.location?.lng  ?? null,
            keyword_searched:  keyword,
            location_searched: location,
            scraped_date:      today,
          });
        }
      } catch (e) {
        console.warn(`Details failed for ${place.place_id}:`, e.message);
      }
    }

    res.json({ results: enriched, count: enriched.length });
  } catch (err) {
    console.error('Scrape error:', err.message);
    res.status(500).json({ error: 'Scrape failed: ' + err.message });
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
app.get('/api/export', (_req, res) => {
  try {
    const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
    const runs     = db.prepare('SELECT * FROM runs ORDER BY created_at DESC').all();

    const wb = XLSX.utils.book_new();

    const contactRows = contacts.map(c => ({
      'Business Name':   c.name              || '',
      'Phone':           c.phone             || '',
      'Website':         c.website           || '',
      'Address':         c.address           || '',
      'Rating':          c.rating            ?? '',
      'Category':        c.types ? c.types.split(',')[0].replace(/_/g, ' ') : '',
      'All Types':       c.types             || '',
      'Latitude':        c.lat               ?? '',
      'Longitude':       c.lng               ?? '',
      'Keyword':         c.keyword_searched  || '',
      'Location':        c.location_searched || '',
      'Scraped Date':    c.scraped_date      || '',
      'Created At':      c.created_at        || '',
      'Place ID':        c.place_id          || '',
    }));
    const ws1 = XLSX.utils.json_to_sheet(contactRows.length ? contactRows : [{}]);
    ws1['!cols'] = [30,18,38,45,8,22,30,10,10,22,22,14,20,32].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws1, 'Business Contacts');

    const runRows = runs.map(r => ({
      'Date':        r.date     || '',
      'Keyword':     r.keyword  || '',
      'Location':    r.location || '',
      'Added':       r.added    ?? 0,
      'Skipped':     r.skipped  ?? 0,
      'Total Found': r.total    ?? 0,
      'Created At':  r.created_at || '',
    }));
    const ws2 = XLSX.utils.json_to_sheet(runRows.length ? runRows : [{}]);
    ws2['!cols'] = [12,25,25,8,8,12,20].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws2, 'Scrape History');

    const buf     = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="google_business_contacts_${dateStr}.xlsx"`);
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  Business Scout API  →  http://localhost:${PORT}\n`);
});
