// Vercel serverless function: receives a merch order and appends it to a Google Sheet.
// Requires env vars: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID
import { google } from 'googleapis';

const REQUIRED = ['name', 'email', 'item', 'size', 'quantity', 'address'];

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};

  // Validate
  for (const f of REQUIRED) {
    if (!body[f] || String(body[f]).trim() === '') {
      return res.status(400).json({ error: `Missing required field: ${f}` });
    }
  }
  if (!isEmail(body.email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const qty = parseInt(body.quantity, 10);
  if (!Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ error: 'Quantity must be a positive number.' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Orders!A1',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          new Date().toISOString(),
          String(body.name).trim(),
          String(body.email).trim(),
          String(body.phone || '').trim(),
          String(body.item).trim(),
          String(body.size).trim(),
          qty,
          String(body.address).trim(),
          String(body.notes || '').trim(),
        ]],
      },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Sheet append failed:', err?.message || err);
    return res.status(500).json({ error: 'Could not save your order. Please try again later.' });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
