require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMP DEFAULT NOW(),
      last_login    TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      place_id          TEXT UNIQUE NOT NULL,
      name              TEXT,
      phone             TEXT,
      website           TEXT,
      address           TEXT,
      rating            REAL,
      types             TEXT,
      lat               REAL,
      lng               REAL,
      keyword_searched  TEXT,
      location_searched TEXT,
      scraped_date      TEXT,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS runs (
      id         SERIAL PRIMARY KEY,
      keyword    TEXT,
      location   TEXT,
      date       TEXT,
      added      INTEGER DEFAULT 0,
      skipped    INTEGER DEFAULT 0,
      total      INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_contacts (
      id             SERIAL PRIMARY KEY,
      contact_id     INTEGER,
      place_id       TEXT UNIQUE,
      name           TEXT,
      phone          TEXT,
      website        TEXT,
      address        TEXT,
      rating         TEXT,
      category       TEXT,
      status         TEXT DEFAULT 'Not Called',
      call_date      TEXT,
      contact_person TEXT,
      outcome        TEXT,
      notes          TEXT,
      next_action    TEXT,
      priority       TEXT DEFAULT 'Cold',
      moved_at       TIMESTAMP DEFAULT NOW(),
      updated_at     TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS linkedin_contacts (
      id                SERIAL PRIMARY KEY,
      profile_url       TEXT UNIQUE,
      full_name         TEXT,
      first_name        TEXT,
      last_name         TEXT,
      headline          TEXT,
      current_company   TEXT,
      current_title     TEXT,
      location          TEXT,
      email             TEXT,
      phone             TEXT,
      linkedin_url      TEXT,
      profile_picture   TEXT,
      connections       INTEGER,
      summary           TEXT,
      scraped_date      TEXT,
      keyword_searched  TEXT,
      location_searched TEXT,
      crm_status        TEXT DEFAULT 'Not Contacted',
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Column migrations — safe to run every startup ─────────────────────────
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP`);

  console.log('PostgreSQL tables ready');
}

initDB().catch(err => {
  console.error('DB init error:', err);
  process.exit(1);
});

module.exports = { pool };
