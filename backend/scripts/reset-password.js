// Admin tool: list accounts or set a new password directly in the database.
//
//   node scripts/reset-password.js --list
//   node scripts/reset-password.js someone@example.com NewPassword123
//
// Uses DATABASE_URL from the environment (or backend/.env). To target
// production, set DATABASE_URL to the production database URL first, e.g.
// run it from the Render service's Shell tab, or locally with:
//   $env:DATABASE_URL = "<production url>"; node scripts/reset-password.js --list
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set.'); process.exit(1); }

const isLocal = /localhost|127\.0\.0\.1/.test(url);
const pool = new Pool({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });

(async () => {
  const [arg1, arg2] = process.argv.slice(2);
  try {
    const host = new URL(url).hostname;
    console.log(`Database host: ${host}\n`);

    if (!arg1 || arg1 === '--list') {
      const { rows } = await pool.query(
        'SELECT id, email, created_at, last_login FROM users ORDER BY id'
      );
      if (!rows.length) console.log('No accounts in this database.');
      for (const r of rows) {
        const weird = r.email !== r.email.trim().toLowerCase() ? '  <-- has caps/spaces' : '';
        console.log(`#${r.id}  ${JSON.stringify(r.email)}  created ${r.created_at?.toISOString?.() ?? r.created_at}  last login ${r.last_login ? r.last_login.toISOString() : 'never'}${weird}`);
      }
      if (!arg1) console.log('\nTo reset: node scripts/reset-password.js <email> <new-password>');
      return;
    }

    const email = arg1.trim().toLowerCase();
    const pw    = arg2;
    if (!pw || pw.length < 6) { console.error('New password must be at least 6 characters.'); process.exitCode = 1; return; }

    const hash = await bcrypt.hash(pw, 10);
    // Also normalises the stored email so future logins match exactly.
    const { rows } = await pool.query(
      `UPDATE users SET password_hash = $1, email = $2, reset_token = NULL, reset_token_expires = NULL
       WHERE id = (SELECT id FROM users WHERE LOWER(TRIM(email)) = $2 ORDER BY id LIMIT 1)
       RETURNING id, email`,
      [hash, email]
    );
    if (!rows.length) { console.error(`No account found for ${email}. Run with --list to see accounts.`); process.exitCode = 1; return; }
    console.log(`Password updated for #${rows[0].id} ${rows[0].email}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
