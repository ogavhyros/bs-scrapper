require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const axios        = require('axios');
const ExcelJS      = require('exceljs');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const nodemailer   = require('nodemailer');
const crypto       = require('crypto');
const { pool }     = require('./db');

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
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'An account with this email already exists.' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
      [email.toLowerCase(), hash]
    );
    res.json({ success: true, message: 'Account created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
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

// ── Temporary debug endpoint ──────────────────────────────────────────────────
app.get('/api/auth/debug', async (_req, res) => {
  try {
    const { rows: count }  = await pool.query('SELECT COUNT(*) as count FROM users');
    const { rows: columns } = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    res.json({ user_count: count[0].count, columns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (rows.length > 0) {
      const token   = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600 * 1000); // 1 hour
      await pool.query(
        'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
        [token, expires, email.toLowerCase()]
      );
      const resetUrl = `${process.env.FRONTEND_URL || 'https://bs-scrapper-ivory.vercel.app'}?token=${token}`;
      const html = `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,Helvetica,sans-serif;background:#f8f9fa;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:28px;font-weight:700;color:#1a2e1a;">Business </span>
      <span style="font-size:28px;font-weight:700;color:#42D674;">Scout</span>
    </div>
    <h2 style="color:#1a2e1a;margin-bottom:12px;">Reset your password</h2>
    <p style="color:#6b7280;line-height:1.6;">
      You requested a password reset for your Business Scout account.
      Click the button below to create a new password.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}"
         style="background:#42D674;color:white;padding:14px 32px;border-radius:10px;
                text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
        Reset Password
      </a>
    </div>
    <p style="color:#9ca3af;font-size:13px;text-align:center;">
      This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;

      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        await transporter.sendMail({
          from: `"Business Scout" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Reset your Business Scout password',
          html,
        });
      }
    }
    // Always return success — don't reveal whether email exists
    res.json({ message: 'Reset email sent if account exists' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  try {
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset link.' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hash, rows[0].id]
    );
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

      const query = `${keyword} ${location}`;
      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json` +
                `?query=${encodeURIComponent(query)}` +
                `&radius=${radius || 5000}&key=${apiKey}`;
      if (pageToken) url += `&pagetoken=${pageToken}`;

      const response = await fetch(url);
      const data     = await response.json();

      console.log('Results count:', data.results?.length);

      if (data.status === 'REQUEST_DENIED') {
        send({ type: 'error', message: `Google API: REQUEST_DENIED — ${data.error_message || 'Check your API key and billing.'}` });
        return res.end();
      }
      if (data.status === 'INVALID_REQUEST') {
        // pageToken not yet warmed up — stop paginating and process what we have
        if (allPlaces.length > 0) break;
        send({ type: 'error', message: `Google API: INVALID_REQUEST — ${data.error_message || 'Bad request parameters.'}` });
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
    console.log('Processing results...');

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
    let new_added = 0, skipped = 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const c of enriched) {
        const result = await client.query(`
          INSERT INTO contacts
            (place_id, name, phone, website, address, rating, types, lat, lng,
             keyword_searched, location_searched, scraped_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (place_id) DO NOTHING
        `, [
          c.place_id, c.name, c.phone, c.website, c.address,
          c.rating, c.types, c.lat, c.lng,
          c.keyword_searched, c.location_searched, c.scraped_date,
        ]);
        if (result.rowCount > 0) new_added++; else skipped++;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    console.log('New contacts added:', new_added);
    console.log('Duplicates skipped:', skipped);

    // ── 4. Log run ────────────────────────────────────────────────────────────
    await pool.query(
      'INSERT INTO runs (keyword, location, date, added, skipped, total) VALUES ($1, $2, $3, $4, $5, $6)',
      [keyword, location, today, new_added, skipped, enriched.length]
    );

    sendProgress(`Done! Added ${new_added} new contact${new_added !== 1 ? 's' : ''} from ${allPlaces.length} found.`);
    send({ type: 'result', total_found: allPlaces.length, new_added, skipped, pages_fetched: pageCount });
    res.end();

  } catch (err) {
    console.error('Scrape error:', err.message);
    console.error('Stack:', err.stack);
    send({ type: 'error', message: 'Scrape failed: ' + err.message });
    res.end();
  }
});

// ─── DELETE /api/contacts/no-data ────────────────────────────────────────────
app.delete('/api/contacts/no-data', requireAuth, async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT place_id FROM contacts WHERE (phone IS NULL OR phone = '') AND (website IS NULL OR website = '')`
    );
    const ids = rows.map(r => r.place_id);
    if (ids.length === 0) { await client.query('ROLLBACK'); return res.json({ deleted: 0 }); }
    await client.query('DELETE FROM crm_contacts WHERE place_id = ANY($1)', [ids]);
    const result = await client.query(
      `DELETE FROM contacts WHERE (phone IS NULL OR phone = '') AND (website IS NULL OR website = '')`
    );
    await client.query('COMMIT');
    res.json({ deleted: result.rowCount });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── DELETE /api/contacts/bulk ────────────────────────────────────────────────
app.delete('/api/contacts/bulk', requireAuth, async (req, res) => {
  const { place_ids } = req.body;
  if (!Array.isArray(place_ids) || place_ids.length === 0) return res.json({ deleted: 0 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM crm_contacts WHERE place_id = ANY($1)', [place_ids]);
    const result = await client.query('DELETE FROM contacts WHERE place_id = ANY($1)', [place_ids]);
    await client.query('COMMIT');
    res.json({ deleted: result.rowCount });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── GET /api/contacts ───────────────────────────────────────────────────────
app.get('/api/contacts', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/contacts ──────────────────────────────────────────────────────
app.post('/api/contacts', requireAuth, async (req, res) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts) || contacts.length === 0) return res.json({ added: 0, skipped: 0 });

  let added = 0, skipped = 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const c of contacts) {
      const result = await client.query(`
        INSERT INTO contacts
          (place_id, name, phone, website, address, rating, types, lat, lng,
           keyword_searched, location_searched, scraped_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (place_id) DO NOTHING
      `, [
        c.place_id, c.name, c.phone, c.website, c.address,
        c.rating, c.types, c.lat, c.lng,
        c.keyword_searched, c.location_searched, c.scraped_date,
      ]);
      if (result.rowCount > 0) added++; else skipped++;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return res.status(500).json({ error: err.message });
  }
  client.release();
  res.json({ added, skipped });
});

// ─── GET /api/runs ───────────────────────────────────────────────────────────
app.get('/api/runs', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM runs ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/runs ──────────────────────────────────────────────────────────
app.post('/api/runs', requireAuth, async (req, res) => {
  const { keyword, location, date, added, skipped, total } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO runs (keyword, location, date, added, skipped, total) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [keyword, location, date, added ?? 0, skipped ?? 0, total ?? 0]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/export ─────────────────────────────────────────────────────────
app.get('/api/export', requireAuth, async (_req, res) => {
  try {
    const { rows: contacts } = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
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
app.delete('/api/clear', requireAuth, async (_req, res) => {
  try {
    await pool.query('DELETE FROM contacts');
    await pool.query('DELETE FROM runs');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CRM ROUTES ──────────────────────────────────────────────────────────────

const ALLOWED_CRM_FIELDS = new Set([
  'status', 'call_date', 'contact_person', 'outcome',
  'notes', 'next_action', 'priority',
]);

app.get('/api/crm/stats', requireAuth, async (_req, res) => {
  try {
    const { rows }  = await pool.query('SELECT status, COUNT(*) as count FROM crm_contacts GROUP BY status');
    const { rows: totalRows } = await pool.query('SELECT COUNT(*) as count FROM crm_contacts');
    const total = parseInt(totalRows[0]?.count ?? 0, 10);
    const keyMap = { 'Not Called': 'notCalled', 'Called': 'called', 'Follow Up': 'followUp', 'Converted': 'converted', 'Interested': 'interested', 'Not Interested': 'notInterested' };
    const counts = { total, notCalled: 0, called: 0, followUp: 0, converted: 0, interested: 0, notInterested: 0 };
    for (const r of rows) { const k = keyMap[r.status]; if (k) counts[k] = parseInt(r.count, 10); }
    res.json(counts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/crm', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM crm_contacts ORDER BY moved_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/crm/add', requireAuth, async (req, res) => {
  const { place_ids } = req.body;
  if (!Array.isArray(place_ids) || place_ids.length === 0) return res.json({ added: 0, skipped: 0 });
  let added = 0, skipped = 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const pid of place_ids) {
      const { rows } = await client.query('SELECT * FROM contacts WHERE place_id = $1', [pid]);
      const c = rows[0];
      if (!c) { skipped++; continue; }
      const result = await client.query(`
        INSERT INTO crm_contacts (contact_id, place_id, name, phone, website, address, rating, category)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (place_id) DO NOTHING
      `, [
        c.id, c.place_id, c.name, c.phone, c.website, c.address,
        c.rating != null ? String(c.rating) : null,
        c.types ? c.types.split(',')[0].replace(/_/g, ' ') : null,
      ]);
      if (result.rowCount > 0) added++; else skipped++;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return res.status(500).json({ error: err.message });
  }
  client.release();
  res.json({ added, skipped });
});

app.patch('/api/crm/:place_id', requireAuth, async (req, res) => {
  const { place_id } = req.params;
  const fields = Object.keys(req.body).filter(k => ALLOWED_CRM_FIELDS.has(k));
  if (fields.length === 0) return res.json({ updated: 0 });
  const setClauses = [...fields.map((f, i) => `${f} = $${i + 1}`), 'updated_at = NOW()'].join(', ');
  const values = [...fields.map(f => req.body[f]), place_id];
  try {
    const result = await pool.query(
      `UPDATE crm_contacts SET ${setClauses} WHERE place_id = $${fields.length + 1}`,
      values
    );
    res.json({ updated: result.rowCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/crm/:place_id', requireAuth, async (req, res) => {
  const { place_id } = req.params;
  try {
    const result = await pool.query('DELETE FROM crm_contacts WHERE place_id = $1', [place_id]);
    res.json({ deleted: result.rowCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── APHL AFRICA ROUTES ───────────────────────────────────────────────────────

const parseN = (v) => parseFloat(v) || 0;

// GET /api/aphl/overview
app.get('/api/aphl/overview', requireAuth, async (_req, res) => {
  try {
    const [salesMonth, expMonth, expCat, recentSales, recentExp, monthlyRev, monthlyExp, trucks] = await Promise.all([
      pool.query(`SELECT
          COALESCE(SUM(total_amount),0) AS revenue,
          COALESCE(SUM(CASE WHEN transaction_type='direct_sale' THEN total_amount ELSE 0 END),0) AS direct_sales,
          COALESCE(SUM(CASE WHEN transaction_type='truck_lease'  THEN total_amount ELSE 0 END),0) AS truck_leases,
          COUNT(*)::int AS trips,
          COALESCE(SUM(volume_litres),0) AS litres
        FROM sales WHERE date_trunc('month',date)=date_trunc('month',CURRENT_DATE)`),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS expenses FROM expenses WHERE date_trunc('month',date)=date_trunc('month',CURRENT_DATE)`),
      pool.query(`SELECT category, COALESCE(SUM(amount),0) AS total FROM expenses GROUP BY category ORDER BY total DESC`),
      pool.query(`SELECT * FROM sales ORDER BY date DESC, created_at DESC LIMIT 5`),
      pool.query(`SELECT * FROM expenses ORDER BY date DESC, created_at DESC LIMIT 5`),
      pool.query(`SELECT to_char(date_trunc('month',date),'Mon YY') AS month, date_trunc('month',date) AS mo, COALESCE(SUM(total_amount),0) AS revenue FROM sales GROUP BY date_trunc('month',date) ORDER BY mo DESC LIMIT 6`),
      pool.query(`SELECT to_char(date_trunc('month',date),'Mon YY') AS month, date_trunc('month',date) AS mo, COALESCE(SUM(amount),0) AS expenses FROM expenses GROUP BY date_trunc('month',date) ORDER BY mo DESC LIMIT 6`),
      pool.query(`SELECT truck, COUNT(*)::int AS trips, COALESCE(SUM(volume_litres),0) AS litres, COALESCE(SUM(total_amount),0) AS revenue, MAX(date) AS last_trip FROM sales WHERE date_trunc('month',date)=date_trunc('month',CURRENT_DATE) AND truck IS NOT NULL GROUP BY truck`),
    ]);

    const sm       = salesMonth.rows[0];
    const revenue  = parseN(sm.revenue);
    const expenses = parseN(expMonth.rows[0].expenses);

    const monthMap = {};
    for (const r of monthlyRev.rows)  { monthMap[r.month] = { month: r.month, revenue: parseN(r.revenue), expenses: 0 }; }
    for (const r of monthlyExp.rows)  { if (!monthMap[r.month]) monthMap[r.month] = { month: r.month, revenue: 0, expenses: 0 }; monthMap[r.month].expenses = parseN(r.expenses); }
    const monthlyChart = Object.values(monthMap).slice(0, 6).reverse();

    const truckMap = {};
    for (const t of trucks.rows) truckMap[t.truck] = { trips: t.trips, litres: parseN(t.litres), revenue: parseN(t.revenue), lastTrip: t.last_trip };

    res.json({
      revenue: {
        thisMonth:            revenue,
        directSalesThisMonth: parseN(sm.direct_sales),
        leasesThisMonth:      parseN(sm.truck_leases),
      },
      expenses: { thisMonth: expenses, byCategory: expCat.rows.map(r => ({ category: r.category, total: parseN(r.total) })) },
      profit:   { thisMonth: revenue - expenses },
      trips:    { thisMonth: sm.trips },
      litres:   { thisMonth: parseN(sm.litres) },
      distribution: { operations: +(revenue*0.25).toFixed(2), maintenance: +(revenue*0.10).toFixed(2), savings: +(revenue*0.10).toFixed(2), reinvestment: +(revenue*0.55).toFixed(2) },
      recentSales: recentSales.rows, recentExpenses: recentExp.rows, monthlyChart, trucks: truckMap,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Sales CRUD
app.get('/api/aphl/sales', requireAuth, async (_req, res) => {
  try { const { rows } = await pool.query('SELECT * FROM sales ORDER BY date DESC, created_at DESC'); res.json(rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

function computeTotalAmount(body) {
  const { transaction_type, volume_litres, rate_per_litre, haulage_rate } = body;
  if (transaction_type === 'truck_lease') return parseFloat(haulage_rate) || 0;
  return (parseFloat(volume_litres) || 0) * (parseFloat(rate_per_litre) || 0);
}

app.post('/api/aphl/sales', requireAuth, async (req, res) => {
  const { date, transaction_type, customer_name, customer_phone, customer_address,
          depot_name, product, volume_litres, rate_per_litre, product_amount,
          origin, destination, haulage_rate, distance_km, product_type, lease_volume_litres,
          truck, driver, payment_status, waybill_number, notes } = req.body;
  const total_amount = computeTotalAmount(req.body);
  try {
    const { rows } = await pool.query(`
      INSERT INTO sales
        (date,transaction_type,customer_name,customer_phone,customer_address,
         depot_name,product,volume_litres,rate_per_litre,product_amount,
         origin,destination,haulage_rate,distance_km,product_type,lease_volume_litres,
         total_amount,truck,driver,payment_status,waybill_number,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *`,
      [date, transaction_type||'direct_sale', customer_name, customer_phone||null, customer_address||null,
       depot_name||null, product||null, volume_litres||null, rate_per_litre||null, product_amount||null,
       origin||null, destination||null, haulage_rate||null, distance_km||null, product_type||null, lease_volume_litres||null,
       total_amount, truck||null, driver||null, payment_status||'Pending', waybill_number||null, notes||null]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/aphl/sales/:id', requireAuth, async (req, res) => {
  const { date, transaction_type, customer_name, customer_phone, customer_address,
          depot_name, product, volume_litres, rate_per_litre, product_amount,
          origin, destination, haulage_rate, distance_km, product_type, lease_volume_litres,
          truck, driver, payment_status, waybill_number, notes } = req.body;
  const total_amount = computeTotalAmount(req.body);
  try {
    const { rows } = await pool.query(`
      UPDATE sales SET
        date=$1,transaction_type=$2,customer_name=$3,customer_phone=$4,customer_address=$5,
        depot_name=$6,product=$7,volume_litres=$8,rate_per_litre=$9,product_amount=$10,
        origin=$11,destination=$12,haulage_rate=$13,distance_km=$14,product_type=$15,lease_volume_litres=$16,
        total_amount=$17,truck=$18,driver=$19,payment_status=$20,waybill_number=$21,notes=$22
      WHERE id=$23 RETURNING *`,
      [date, transaction_type||'direct_sale', customer_name, customer_phone||null, customer_address||null,
       depot_name||null, product||null, volume_litres||null, rate_per_litre||null, product_amount||null,
       origin||null, destination||null, haulage_rate||null, distance_km||null, product_type||null, lease_volume_litres||null,
       total_amount, truck||null, driver||null, payment_status, waybill_number||null, notes||null,
       req.params.id]);
    res.json(rows[0] ?? {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/aphl/sales/:id', requireAuth, async (req, res) => {
  try { await pool.query('DELETE FROM sales WHERE id=$1', [req.params.id]); res.json({ deleted: 1 }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Expenses CRUD
app.get('/api/aphl/expenses', requireAuth, async (_req, res) => {
  try { const { rows } = await pool.query('SELECT * FROM expenses ORDER BY date DESC, created_at DESC'); res.json(rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/aphl/expenses', requireAuth, async (req, res) => {
  const { date, category, description, amount, truck, receipt_number, vendor, payment_method, notes } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO expenses (date,category,description,amount,truck,receipt_number,vendor,payment_method,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [date, category, description, amount, truck||null, receipt_number||null, vendor||null, payment_method||'Cash', notes||null]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/aphl/expenses/:id', requireAuth, async (req, res) => {
  const { date, category, description, amount, truck, receipt_number, vendor, payment_method, notes } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE expenses SET date=$1,category=$2,description=$3,amount=$4,truck=$5,receipt_number=$6,vendor=$7,payment_method=$8,notes=$9 WHERE id=$10 RETURNING *`,
      [date, category, description, amount, truck||null, receipt_number||null, vendor||null, payment_method||'Cash', notes||null, req.params.id]);
    res.json(rows[0] ?? {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/aphl/expenses/:id', requireAuth, async (req, res) => {
  try { await pool.query('DELETE FROM expenses WHERE id=$1', [req.params.id]); res.json({ deleted: 1 }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── LINKEDIN ROUTES (NinjaPear — Proxycurl successor) ────────────────────────
// NinjaPear's Employee Search returns employees of a company, optionally filtered
// by role + geography. Base URL https://nubela.co/api/v1. Proxycurl was sunset.

const NINJAPEAR_BASE = 'https://nubela.co/api/v1';
const linkedinApiKey = () => process.env.NINJAPEAR_API_KEY || process.env.PROXYCURL_API_KEY || '';

// Country name → ISO 3166-1 alpha-2 (NinjaPear's `country` filter requires a code).
const COUNTRY_CODES = {
  nigeria: 'NG', 'united states': 'US', usa: 'US', us: 'US', america: 'US',
  'united kingdom': 'GB', uk: 'GB', england: 'GB', britain: 'GB',
  canada: 'CA', australia: 'AU', germany: 'DE', france: 'FR', spain: 'ES',
  italy: 'IT', netherlands: 'NL', india: 'IN', 'south africa': 'ZA',
  ghana: 'GH', kenya: 'KE', ireland: 'IE', singapore: 'SG',
  uae: 'AE', 'united arab emirates': 'AE', brazil: 'BR', mexico: 'MX',
};

// Returns a valid alpha-2 code or null. Accepts a 2-letter code as-is.
function toCountryCode(location = '') {
  const loc = location.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(loc)) return loc.toUpperCase();
  for (const [name, code] of Object.entries(COUNTRY_CODES)) {
    if (loc.includes(name)) return code;
  }
  return null;
}

// Normalise a company input ("https://www.stripe.com/" → "stripe.com")
function normaliseDomain(input = '') {
  return input.trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

// Pretty company name from a domain ("stripe.com" → "Stripe")
function companyNameFromDomain(domain = '') {
  const base = domain.split('.')[0] || domain;
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : null;
}

const LINKEDIN_STATUSES = new Set(['Not Contacted', 'Contacted', 'Connected', 'Not Interested']);

// GET /api/linkedin/contacts
app.get('/api/linkedin/contacts', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM linkedin_contacts ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/linkedin/config — tells the frontend whether a key is present
app.get('/api/linkedin/config', requireAuth, (_req, res) => {
  res.json({ hasKey: Boolean(linkedinApiKey()) });
});

// POST /api/linkedin/scrape — NinjaPear Employee Search (company-based, free key)
app.post('/api/linkedin/scrape', requireAuth, async (req, res) => {
  const apiKey = linkedinApiKey();
  if (!apiKey) return res.status(400).json({ error: 'No NinjaPear API key is set on the server.' });

  const { company_website, keyword, location } = req.body; // keyword = job role (optional)
  let   limit = parseInt(req.body.limit, 10) || 25;
  limit = Math.min(Math.max(limit, 1), 100);

  const domain = normaliseDomain(company_website || '');
  if (!domain) return res.status(400).json({ error: 'A company name or domain is required (e.g. dangote.com).' });

  // NinjaPear requires a role; default to a broad term so "all staff" still works.
  const role  = (keyword && keyword.trim()) || 'employee';
  const today = new Date().toISOString().split('T')[0];

  try {
    const params = { company_website: domain, role }; // role always sent
    const countryCode = toCountryCode(location || '');
    if (countryCode) params.country = countryCode; // NinjaPear needs an ISO alpha-2 code

    const searchRes = await axios.get(`${NINJAPEAR_BASE}/employee/search`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      params,
      timeout: 30000,
    });

    const data      = searchRes.data || {};
    const employees = data.employees || data.results || [];
    const collected = employees.slice(0, limit);
    const company   = companyNameFromDomain(domain);

    let added = 0, skipped = 0;
    const mapped = [];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      for (const e of collected) {
        const first   = e.first_name || null;
        const last    = e.last_name  || null;
        const empRole = e.role || e.title || keyword || null;
        // NinjaPear returns an enrichment URL per employee; use it as the dedup key.
        const profileUrl = e.person_profile || e.profile_url
          || [first, last, domain].filter(Boolean).join('-').toLowerCase().replace(/\s+/g, '-');
        if (!first && !last) { skipped++; continue; }

        const contact = {
          profile_url:       profileUrl,
          full_name:         [first, last].filter(Boolean).join(' ') || null,
          first_name:        first,
          last_name:         last,
          headline:          empRole,
          current_company:   e.company_name || company,
          current_title:     empRole,
          location:          location || null,
          // NinjaPear returns an enrichment *URL* in work_email, not an address.
          email:             (e.work_email && e.work_email.includes('@') && !/^https?:/i.test(e.work_email)) ? e.work_email : null,
          phone:             null,                    // requires separate enrichment call
          linkedin_url:      null,                    // NinjaPear does not return public LinkedIn URLs
          profile_picture:   null,
          connections:       null,
          summary:           null,
          scraped_date:      today,
          keyword_searched:  keyword || '',
          location_searched: location || '',
        };

        const result = await client.query(`
          INSERT INTO linkedin_contacts
            (profile_url, full_name, first_name, last_name, headline, current_company,
             current_title, location, email, phone, linkedin_url, profile_picture,
             connections, summary, scraped_date, keyword_searched, location_searched)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (profile_url) DO NOTHING
        `, [
          contact.profile_url, contact.full_name, contact.first_name, contact.last_name,
          contact.headline, contact.current_company, contact.current_title, contact.location,
          contact.email, contact.phone, contact.linkedin_url, contact.profile_picture,
          contact.connections, contact.summary, contact.scraped_date,
          contact.keyword_searched, contact.location_searched,
        ]);
        if (result.rowCount > 0) { added++; mapped.push(contact); } else skipped++;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      client.release();
      throw err;
    }
    client.release();

    res.json({ added, skipped, total_found: collected.length, contacts: mapped });
  } catch (err) {
    const status = err.response?.status;
    const data   = err.response?.data;
    let detail = err.message;
    if (typeof data === 'string') detail = data;
    else if (data && typeof data === 'object') {
      detail = data.description || data.detail
            || (typeof data.error === 'string' ? data.error : data.error?.message)
            || data.message
            || JSON.stringify(data);
    }
    console.error('LinkedIn (NinjaPear) error:', status, detail);
    if (status === 401 || status === 403) {
      return res.status(400).json({ error: 'NinjaPear rejected the API key (invalid or out of credits).' });
    }
    if (status === 400 || status === 404) {
      return res.status(400).json({ error: `NinjaPear: ${detail}` });
    }
    res.status(500).json({ error: 'LinkedIn search failed: ' + detail });
  }
});

// PATCH /api/linkedin/:id — update crm_status
app.patch('/api/linkedin/:id', requireAuth, async (req, res) => {
  const { crm_status } = req.body;
  if (!LINKEDIN_STATUSES.has(crm_status)) return res.status(400).json({ error: 'Invalid status.' });
  try {
    const result = await pool.query(
      'UPDATE linkedin_contacts SET crm_status = $1 WHERE id = $2',
      [crm_status, req.params.id]
    );
    res.json({ updated: result.rowCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/linkedin/:id
app.delete('/api/linkedin/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM linkedin_contacts WHERE id = $1', [req.params.id]);
    res.json({ deleted: result.rowCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/linkedin/export
app.get('/api/linkedin/export', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM linkedin_contacts ORDER BY created_at DESC');
    const wb   = new ExcelJS.Workbook();
    const ws   = wb.addWorksheet('LinkedIn Contacts');
    ws.columns = [
      { header: '#',            key: 'num',         width: 4  },
      { header: 'Full Name',    key: 'full_name',   width: 28 },
      { header: 'Headline',     key: 'headline',    width: 40 },
      { header: 'Company',      key: 'company',     width: 28 },
      { header: 'Title',        key: 'title',       width: 28 },
      { header: 'Location',     key: 'location',    width: 26 },
      { header: 'Email',        key: 'email',       width: 30 },
      { header: 'Phone',        key: 'phone',       width: 18 },
      { header: 'LinkedIn URL', key: 'linkedin',    width: 40 },
      { header: 'Connections',  key: 'connections', width: 12 },
      { header: 'Date Scraped', key: 'date',        width: 14 },
    ];
    ws.getRow(1).eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0077B5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    rows.forEach((c, i) => ws.addRow({
      num: i + 1, full_name: c.full_name || '', headline: c.headline || '',
      company: c.current_company || '', title: c.current_title || '',
      location: c.location || '', email: c.email || '', phone: c.phone || '',
      linkedin: c.linkedin_url || '', connections: c.connections ?? '', date: c.scraped_date || '',
    }));

    const buf     = await wb.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="linkedin_contacts_${dateStr}.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error('LinkedIn export error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`\n  Business Scout API  →  http://localhost:${PORT}\n`));
