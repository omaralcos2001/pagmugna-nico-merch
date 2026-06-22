// Vercel serverless function: receives a merch order + payment proof,
// emails the order PDF and the proof image to the store owner via Resend.
// Required env var: RESEND_API_KEY
// Optional env var: ORDER_EMAIL (defaults to omaralcos2001@gmail.com)
import { Resend } from 'resend';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const b = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const { name, contact, address, email, items = [], total = 0, pdfBase64, proof } = b;

  if (!name || !contact || !address) {
    return res.status(400).json({ error: 'Missing name, contact or address.' });
  }
  if (!pdfBase64) {
    return res.status(400).json({ error: 'Missing order summary.' });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email is not configured yet (missing RESEND_API_KEY).' });
  }

  const to = process.env.ORDER_EMAIL || 'omaralcos2001@gmail.com';
  const resend = new Resend(process.env.RESEND_API_KEY);

  const itemsHtml = items
    .map(i => `<li>${esc(i.name)} — ${esc(i.size)} × ${i.qty} — ₱${(i.price * i.qty).toLocaleString()}</li>`)
    .join('');

  const attachments = [{ filename: 'order.pdf', content: Buffer.from(pdfBase64, 'base64') }];
  if (proof && proof.base64) {
    attachments.push({ filename: proof.filename || 'proof.jpg', content: Buffer.from(proof.base64, 'base64') });
  }

  try {
    await resend.emails.send({
      from: 'PAGMOVE-ON MERCH <onboarding@resend.dev>',
      to: [to],
      replyTo: email || undefined,
      subject: `New order — ${name} (₱${Number(total).toLocaleString()})`,
      html: `
        <h2>New PAGMOVE-ON MERCH order</h2>
        <p>
          <b>Name:</b> ${esc(name)}<br/>
          <b>Contact:</b> ${esc(contact)}<br/>
          <b>Email:</b> ${esc(email || '—')}<br/>
          <b>Address:</b> ${esc(address)}
        </p>
        <h3>Items</h3>
        <ul>${itemsHtml}</ul>
        <p><b>Total: ₱${Number(total).toLocaleString()}</b></p>
        <p>The full order summary (PDF) and the customer's payment proof are attached.</p>`,
      attachments,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Email send failed:', err?.message || err);
    return res.status(500).json({ error: 'Could not send your order. Please try again.' });
  }
}

function safeParse(s){ try { return JSON.parse(s); } catch { return {}; } }
function esc(s){ return String(s).replace(/[<>&]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;' }[c])); }
