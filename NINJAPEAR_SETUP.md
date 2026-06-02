# LinkedIn Scraper Setup (NinjaPear)

> **Note:** Proxycurl (the originally-planned provider) was **permanently sunset** in 2026.
> Business Scout's LinkedIn tab now uses **NinjaPear** (https://nubela.co), Proxycurl's
> official successor, via its **Employee Search** endpoint.

## Getting Your NinjaPear API Key

1. Go to https://nubela.co
2. Sign up and verify your email
3. Open your Dashboard → **API Key**
4. Copy the key
5. Add it to Render environment variables:
   - Key: `NINJAPEAR_API_KEY`  (the legacy name `PROXYCURL_API_KEY` is also accepted)
   - Value: *your NinjaPear key*
6. Redeploy on Render

## How the search works

NinjaPear's people-discovery endpoint is **company-based**, not location-based:

- **Company Website** (required) — e.g. `stripe.com`. Returns employees of that company.
- **Job Role** (optional) — narrows to a title, e.g. `Sales Director`.
- **Location** (optional) — narrows by country.

Endpoint used: `GET https://nubela.co/api/v1/employee/search`

## Pricing & credits

- Employee Search: **2 credits base + 1 credit per employee returned**.
- The search returns name, role and company. **Email and phone require a separate
  enrichment call** per person (`/employee/profile` = 3 credits,
  `/employee/work-email` = 2 credits) — not enabled by default to keep credit usage low.

## What changed from the original spec

| Original (Proxycurl) | Now (NinjaPear) |
|---|---|
| Search by job title + location across all companies | Search employees **within a company** (+ optional role/location) |
| One call returned full profile incl. email/phone | Search returns basic fields; email/phone need extra enrichment calls |
| `proxycurl.com` | `nubela.co` |
