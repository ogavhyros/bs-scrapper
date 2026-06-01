# Business Scout

A full-stack web app that scrapes Google Places to build a searchable, exportable database of business contacts — phone numbers, websites, addresses, and ratings.

## Features

- **Google Places scraping** — Text Search + Place Details for up to 10 results per query
- **Automatic deduplication** — each business is stored once by its unique Google Place ID
- **SQLite persistence** — contacts and run history survive restarts
- **Excel export** — two-sheet `.xlsx` with all contacts + scrape history
- **Dark professional UI** — search/filter table, stats dashboard, run history

---

## Quick Start

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A Google Places API key (see below)

> **Windows users:** `better-sqlite3` requires native build tools. If `npm install` fails on the backend, run:
> ```
> npm install -g windows-build-tools
> ```
> or install **Visual Studio Build Tools** with the "Desktop development with C++" workload.

### 2. Clone & Install

```bash
git clone <your-repo>
cd business-scout

# Install all dependencies (root + backend + frontend)
npm run install:all
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env if you want to change the backend port (default: 3001)
```

### 4. Run

```bash
npm run dev
```

This starts both servers via `concurrently`:
- **API** → `http://localhost:3001`
- **UI**  → `http://localhost:5173`

Open **http://localhost:5173** in your browser.

---

## How to get a Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to **APIs & Services → Library**
4. Enable **Places API** (and optionally **Maps JavaScript API**)
5. Go to **APIs & Services → Credentials → Create Credentials → API Key**
6. (Recommended) Restrict the key to the **Places API** under "API restrictions"
7. Copy the key — it starts with `AIza...`

> **Free tier:** Google gives $200/month in free API credits. Each Text Search costs ~$0.032 and each Place Details call costs ~$0.017, so ~10 businesses × 2 calls = ~$0.50/scrape. Well within free limits for personal use.

---

## Project Structure

```
business-scout/
├── backend/
│   ├── db.js          # SQLite setup (contacts + runs tables)
│   ├── server.js      # Express API (7 endpoints)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Tab navigation + data fetching
│   │   ├── components/
│   │   │   ├── ScraperTab.jsx    # Search form + stats
│   │   │   ├── ContactsTab.jsx   # Searchable table + export
│   │   │   └── HistoryTab.jsx    # Run history
│   │   └── index.css
│   ├── index.html
│   └── package.json
├── .env.example
└── package.json       # Root: concurrently dev script
```

## API Endpoints

| Method | Endpoint       | Description                              |
|--------|----------------|------------------------------------------|
| POST   | /api/scrape    | Fetch from Google Places (not saved yet) |
| GET    | /api/contacts  | All saved contacts                       |
| POST   | /api/contacts  | Save contacts (INSERT OR IGNORE)         |
| GET    | /api/runs      | All scrape run logs                      |
| POST   | /api/runs      | Log a scrape run                         |
| GET    | /api/export    | Download `.xlsx` file                    |
| DELETE | /api/clear     | Wipe all contacts + runs                 |

## Database Schema

**contacts**

| Column            | Type    | Notes               |
|-------------------|---------|---------------------|
| id                | INTEGER | Primary key         |
| place_id          | TEXT    | UNIQUE — Google ID  |
| name              | TEXT    |                     |
| phone             | TEXT    |                     |
| website           | TEXT    |                     |
| address           | TEXT    |                     |
| rating            | REAL    |                     |
| types             | TEXT    | Comma-separated     |
| lat / lng         | REAL    |                     |
| keyword_searched  | TEXT    |                     |
| location_searched | TEXT    |                     |
| scraped_date      | TEXT    | YYYY-MM-DD          |
| created_at        | TEXT    | SQLite datetime     |

**runs** — keyword, location, date, added, skipped, total, created_at
