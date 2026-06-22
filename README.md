# PAGMOVE-ON MERCH by Doc Nico

A parody merch store (static `index.html`) with a QR-code checkout. Customers
pick items, scan a payment QR, upload their proof of payment, and submit. A
Vercel serverless function (`api/submit.js`) emails the order — as a PDF plus the
proof image — to the store owner.

```
index.html         → the store + checkout flow (order PDF is built in the browser)
api/submit.js       → POST endpoint, emails the PDF + proof via Resend
assets/             → product photos + payment QR (see assets/README.md)
package.json        → backend dependency (resend)
vercel.json         → Vercel config
```

## How it works

Customer fills the cart → Checkout → enters name / contact / address → scans the
payment QR → uploads proof → "Proceed to submit". The browser builds an order PDF
(with the proof embedded) and sends it to `/api/submit`, which emails everything
to the owner.

---

## Setup

### 1. Add your images
Drop product photos and your payment QR into `assets/` (see `assets/README.md`).
The QR must be named **`payment-qr.png`**.

### 2. Get a Resend API key (free)
1. Sign up at <https://resend.com> — **use omaralcos2001@gmail.com** as the account
   email so test sends work immediately without a custom domain.
2. Go to **API Keys → Create API Key**, copy the key (starts with `re_`).

### 3. Add the env var in Vercel
Project → **Settings → Environment Variables**:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | the `re_...` key from Resend |
| `ORDER_EMAIL` *(optional)* | where orders are sent (defaults to `omaralcos2001@gmail.com`) |

Redeploy after adding it.

> The sender is `onboarding@resend.dev` (Resend's shared test sender). With it you
> can only send to the email that owns the Resend account — which is why step 2
> uses omaralcos2001@gmail.com. To send from your own domain / to other addresses,
> verify a domain in Resend and change the `from:` line in `api/submit.js`.

### 4. Deploy
Push to GitHub and import the repo in Vercel (Framework preset: **Other**). Each
push auto-redeploys.

### Test
Open the live site → add items → checkout → upload any image as proof → submit.
An email with `order.pdf` + the proof image should arrive at the order address.

---

## Notes
- Proof images are downscaled in the browser before upload to stay within limits.
- Checkout only works on the deployed site (the `/api/submit` function needs a
  server) — opening `index.html` directly will show the store but not submit.
- `.env*` and `node_modules/` are gitignored.
