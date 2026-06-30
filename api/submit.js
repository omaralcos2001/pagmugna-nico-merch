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
  const { name, contact, email, items = [], total = 0, pdfBase64, proof } = b;
  const STORE = (b.store && String(b.store).trim()) || 'PAGMOVE-ON MERCH';
  const method = (b.method && String(b.method).trim()) || '';
  const location = (b.location && String(b.location).trim()) || '';
  const fulfillment = (b.fulfillment && String(b.fulfillment).trim()) || b.address || method || '—';

  if (!name || !contact || !email || !method) {
    return res.status(400).json({ error: 'Missing name, contact, email or fulfillment method.' });
  }
  if (!pdfBase64) {
    return res.status(400).json({ error: 'Missing order summary.' });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email is not configured yet (missing RESEND_API_KEY).' });
  }

  const to = process.env.ORDER_EMAIL || 'virayjes@gmail.com';
  const resend = new Resend(process.env.RESEND_API_KEY);

  const itemsHtml = items
    .map(i => `<li>${esc(i.name)} — ${esc(i.size)} × ${i.qty} — ₱${(i.price * i.qty).toLocaleString()}</li>`)
    .join('');

  const attachments = [{ filename: 'order.pdf', content: Buffer.from(pdfBase64, 'base64') }];
  if (proof && proof.base64) {
    attachments.push({ filename: proof.filename || 'proof.jpg', content: Buffer.from(proof.base64, 'base64') });
  }

  const FROM = `${STORE} <onboarding@resend.dev>`;
  const totalStr = Number(total).toLocaleString();

  // Email 1 — to the store owner (full details + attachments)
  const ownerEmail = {
    from: FROM,
    to: [to],
    cc: ['omaralcos2001@gmail.com', 'coy.nunez19@gmail.com'],
    replyTo: email,
    subject: `New ${STORE} order — ${name} (₱${totalStr})`,
    html: `
      <h2>New ${STORE} order</h2>
      <p>
        <b>Name:</b> ${esc(name)}<br/>
        <b>Contact:</b> ${esc(contact)}<br/>
        <b>Email:</b> ${esc(email)}<br/>
        <b>Fulfillment:</b> ${esc(method)}${location ? ' — ' + esc(location) : ''}
      </p>
      <h3>Items</h3>
      <ul>${itemsHtml}</ul>
      <p><b>Total: ₱${totalStr}</b></p>
      <p>The full order summary (PDF) and the customer's payment proof are attached.</p>`,
    attachments,
  };

  // Email 2 — to the customer (confirmation, sent separately)
  const customerEmail = {
    from: FROM,
    to: [email],
    replyTo: to,
    subject: `We received your ${STORE} order, ${name}!`,
    html: `
      <h2>Salamat, ${esc(name)}! 🎉</h2>
      <p>We’ve received your order and your payment proof. We’ll confirm and arrange delivery shortly.</p>
      <h3>Your order</h3>
      <ul>${itemsHtml}</ul>
      <p><b>Total: ₱${totalStr}</b></p>
      <p><b>Fulfillment:</b> ${esc(fulfillment)}</p>
      <p>A copy of your order summary is attached.</p>
      <p style="color:#5d7568;font-size:13px">${STORE}</p>`,
    attachments: [{ filename: 'order.pdf', content: Buffer.from(pdfBase64, 'base64') }],
  };

  try {
    // Owner email must succeed. CC addresses may be blocked until a domain is
    // verified in Resend — if the CC'd send is rejected, retry without CC.
    let ownerRes = await resend.emails.send(ownerEmail);
    if (ownerRes?.error) {
      console.warn('Send with CC failed, retrying without CC:', ownerRes.error.message);
      const { cc, ...noCc } = ownerEmail;
      ownerRes = await resend.emails.send(noCc);
      if (ownerRes?.error) throw new Error(ownerRes.error.message || 'owner email failed');
    }

    // Customer email is best-effort (may be blocked until a domain is verified in Resend)
    let customerSent = true, customerNote;
    try {
      const custRes = await resend.emails.send(customerEmail);
      if (custRes?.error) { customerSent = false; customerNote = custRes.error.message; }
    } catch (e) {
      customerSent = false; customerNote = e?.message;
    }
    if (!customerSent) console.warn('Customer confirmation not sent:', customerNote);

    return res.status(200).json({ ok: true, customerSent });
  } catch (err) {
    console.error('Email send failed:', err?.message || err);
    return res.status(500).json({ error: 'Could not send your order. Please try again.' });
  }
}

function safeParse(s){ try { return JSON.parse(s); } catch { return {}; } }
function esc(s){ return String(s).replace(/[<>&]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;' }[c])); }
