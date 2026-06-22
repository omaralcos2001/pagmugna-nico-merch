# Pagmugna × Nico — Merch Order Form

A public merch order form. Static frontend (`index.html`) + a Vercel serverless
backend (`api/submit.js`) that appends each order as a row in a Google Sheet.

```
index.html        → the order form (served as the homepage)
api/submit.js      → POST endpoint, validates + writes to Google Sheets
package.json       → backend dependency (googleapis)
vercel.json        → Vercel config
```

## How it works

Visitor fills the form → browser POSTs JSON to `/api/submit` → the serverless
function validates it and appends a row to your Google Sheet.

---

## Setup

### 1. Create the Google Sheet

1. Make a new Google Sheet.
2. Rename the first tab to **`Orders`**.
3. (Optional) Add a header row in row 1:
   `Timestamp | Name | Email | Phone | Item | Size | Qty | Address | Notes`
4. Copy the **Sheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

### 2. Create a Google service account

1. Go to <https://console.cloud.google.com/> → create/select a project.
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **APIs & Services → Credentials → Create credentials → Service account.**
4. Once created, open it → **Keys → Add key → Create new key → JSON**. A JSON
   file downloads. From it you need:
   - `client_email`  → this is `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key`   → this is `GOOGLE_PRIVATE_KEY`
5. **Share the Sheet** with that `client_email` (give **Editor** access), exactly
   like sharing with a person. This is what lets the function write to it.

### 3. Deploy to Vercel

1. Go to <https://vercel.com> → **Add New → Project** → import this GitHub repo.
2. Framework preset: **Other**. No build command needed.
3. Add **Environment Variables** (Project Settings → Environment Variables):

   | Name | Value |
   |------|-------|
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | the `client_email` from the JSON |
   | `GOOGLE_PRIVATE_KEY` | the full `private_key` from the JSON, including `-----BEGIN…END-----` |
   | `GOOGLE_SHEET_ID` | the Sheet ID from step 1 |

   > For `GOOGLE_PRIVATE_KEY`, paste the whole value. If newlines get flattened
   > into `\n`, that's fine — the code converts `\n` back to real newlines.

4. **Deploy.** Your form is now public at `https://<your-project>.vercel.app`.

### Test
Open the deployed URL, submit a test order, and confirm a new row appears in the
**Orders** tab of your Sheet.

---

## Local development (optional)

```bash
npm install
npm i -g vercel
vercel dev          # add the 3 env vars to a .env.local first
```

## Notes
- `.env*` and `node_modules/` are gitignored — never commit your private key.
- Want email alerts on each order too? That can be added to `api/submit.js`.
