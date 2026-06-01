require('dotenv').config();
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.db');

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    place_id      TEXT    UNIQUE NOT NULL,
    name          TEXT,
    phone         TEXT,
    website       TEXT,
    address       TEXT,
    rating        REAL,
    types         TEXT,
    lat           REAL,
    lng           REAL,
    keyword_searched   TEXT,
    location_searched  TEXT,
    scraped_date  TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword    TEXT,
    location   TEXT,
    date       TEXT,
    added      INTEGER DEFAULT 0,
    skipped    INTEGER DEFAULT 0,
    total      INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS crm_contacts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
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
    moved_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;
