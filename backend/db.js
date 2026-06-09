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

  // ── APHL Africa — Sales ───────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id               SERIAL PRIMARY KEY,
      date             DATE NOT NULL,
      transaction_type TEXT NOT NULL DEFAULT 'direct_sale',
      customer_name    TEXT NOT NULL,
      customer_phone   TEXT,
      customer_address TEXT,
      depot_name       TEXT,
      product          TEXT,
      volume_litres    NUMERIC,
      rate_per_litre   NUMERIC,
      product_amount   NUMERIC,
      origin           TEXT,
      destination      TEXT,
      haulage_rate     NUMERIC,
      distance_km      NUMERIC,
      product_type     TEXT,
      lease_volume_litres NUMERIC,
      total_amount     NUMERIC NOT NULL DEFAULT 0,
      truck            TEXT,
      driver           TEXT,
      payment_status   TEXT DEFAULT 'Pending',
      waybill_number   TEXT,
      notes            TEXT,
      created_at       TIMESTAMP DEFAULT NOW()
    )
  `);
  // ── Sales table migrations (safe on every startup) ───────────────────────
  // Convert generated total_amount → regular column if needed
  await pool.query(`
    DO $$ BEGIN
      BEGIN
        ALTER TABLE sales ALTER COLUMN total_amount DROP EXPRESSION;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END $$
  `);
  await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'direct_sale'`);
  await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_phone TEXT`);
  await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_address TEXT`);
  await pool.query(`ALTER TABLE sales ALTER COLUMN depot_name DROP NOT NULL`);
  await pool.query(`ALTER TABLE sales ALTER COLUMN product DROP NOT NULL`);
  await pool.query(`ALTER TABLE sales ALTER COLUMN volume_litres DROP NOT NULL`);
  await pool.query(`ALTER TABLE sales ALTER COLUMN rate_per_litre DROP NOT NULL`);
  await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_amount NUMERIC`);
  await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS origin TEXT`);
  await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS destination TEXT`);
  await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS haulage_rate NUMERIC`);
  await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS distance_km NUMERIC`);
  await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_type TEXT`);
  await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS lease_volume_litres NUMERIC`);

  // ── APHL Africa — Expenses ────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id             SERIAL PRIMARY KEY,
      date           DATE NOT NULL,
      category       TEXT NOT NULL,
      description    TEXT NOT NULL,
      amount         NUMERIC NOT NULL,
      truck          TEXT,
      receipt_number TEXT,
      vendor         TEXT,
      payment_method TEXT DEFAULT 'Cash',
      notes          TEXT,
      created_at     TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── APHL Africa — Rate Calculations ──────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rate_calculations (
      id                  SERIAL PRIMARY KEY,
      route               TEXT,
      product             TEXT,
      volume_litres       NUMERIC,
      truck               TEXT,
      diesel_litres       NUMERIC,
      diesel_price        NUMERIC,
      diesel_cost         NUMERIC,
      total_trip_expenses NUMERIC,
      company_overhead    NUMERIC,
      total_cost          NUMERIC,
      target_margin       NUMERIC,
      break_even_rate     NUMERIC,
      recommended_rate    NUMERIC,
      total_revenue       NUMERIC,
      net_profit          NUMERIC,
      calculated_at       TIMESTAMP DEFAULT NOW()
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
