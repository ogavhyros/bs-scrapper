require('dotenv').config();
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'contacts.db'));

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

module.exports = db;
