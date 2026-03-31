# Intershopper

Generate **hosted Interswitch payment links** from a product description and a
price, then copy the link or share it on WhatsApp — no separate backend, all
inside a Next.js app that deploys to Vercel.

Built on Interswitch's [Pay Bill](https://docs.interswitchgroup.com/docs/pay-bill)
API: one `POST` creates a one-time payment link (`paymentUrl`) hosted by
Interswitch, and a server-side status query confirms payment.

## Features

- **Product description + price → payment link** (amounts handled in kobo automatically)
- **Copy link** / **Share on WhatsApp** (pre-filled message) / **Open checkout**
- **Link history persisted in SQLite** (libSQL) with pending/paid status
- **Status checks** against Interswitch's `gettransaction` endpoint, with amount
  verification before marking a link as paid
- **Post-payment return page** (`/payment/success`) for the customer
- **Sandbox ⇄ production** switch via one env var

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. `.env.local` ships with the **public test
credentials** published in Interswitch's docs (Merchant `MX6072`, Pay Item
`9405967`), so link creation works against the sandbox immediately.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `INTERSWITCH_ENV` | no | `sandbox` (default) or `production` |
| `INTERSWITCH_CLIENT_ID` | yes | Quickteller Business → Developer Tools |
| `INTERSWITCH_SECRET_KEY` | yes | Quickteller Business → Developer Tools |
| `INTERSWITCH_MERCHANT_CODE` | no | Defaults to `MX6072` (test) |
| `INTERSWITCH_PAYABLE_CODE` | no | Pay Item ID, defaults to `9405967` (test) |
| `TURSO_DATABASE_URL` | on Vercel | Turso/libSQL URL for persistent SQLite |
| `TURSO_AUTH_TOKEN` | with URL | Turso auth token |
| `NEXT_PUBLIC_APP_URL` | recommended | Public origin for the payment return URL |

Endpoint overrides if your account differs: `INTERSWITCH_PASSPORT_URL`,
`INTERSWITCH_PAYBILL_URL`, `INTERSWITCH_STATUS_URL`.

## Deploy to Vercel

1. **Push this repo to GitHub** and import it in Vercel (framework: Next.js,
   build `next build`, no special config).
2. **Set the env vars** above in *Project → Settings → Environment Variables*
   (at minimum the four `INTERSWITCH_*` ones; use your real credentials for
   production).
3. **Database — pick one:**
   - **Persistent (recommended):** create a free [Turso](https://turso.tech)
     database, set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`. Same SQLite
     schema works locally and remotely.
   - **No Turso:** the app falls back to `file:/tmp/intershopper.db` on Vercel.
     It works, but link history resets on cold starts (the payment links
     themselves live at Interswitch, so they keep working).
4. Deploy. To go live, set `INTERSWITCH_ENV=production` plus your production
   merchant/payable/client/secret values.

## Architecture

```
src/
├── lib/
│   ├── interswitch.ts   OAuth token (cached) + createBill + getTransactionStatus
│   ├── db.ts            libSQL client (file: locally / Turso remotely) + schema
│   ├── links.ts         repository (insert/list/get/update status)
│   ├── format.ts        kobo↔naira, currency + WhatsApp message helpers
│   └── types.ts         shared types (safe for client imports)
├── app/
│   ├── page.tsx         dashboard (force-dynamic, server-rendered history)
│   ├── payment/success/ post-payment return page (?ref=<transaction ref>)
│   └── api/links/
│       ├── route.ts             POST create · GET list
│       └── [id]/status/route.ts GET status check (verifies amount, persists)
└── components/          dashboard, link actions (copy/WhatsApp/open), badges
```

### API contract (verified against live endpoints)

| Step | Endpoint |
| --- | --- |
| Token | `POST https://passport-sandbox.interswitchng.com/passport/oauth/token` (Basic `clientId:secret`, `grant_type=client_credentials`) |
| Create link | `POST https://sandbox.interswitchng.com/paymentgateway/api/v1/paybill` (Bearer) → `{ paymentUrl, reference }` |
| Status | `GET https://sandbox.interswitchng.com/collections/api/v1/gettransaction.json?merchantcode=&transactionreference=&amount=` |

Production hosts: `passport.interswitchng.com` + `webpay.interswitchng.com`.
Interswitch amounts are **minor units (kobo)**; currency code `566` = NGN.

## Notes & gotchas

- **Sandbox `paymentUrl`s point at an internal host** (`*.k8.isw.la`) that only
  resolves inside Interswitch's network — sandbox links are for API testing.
  Real shareable links come from production credentials.
- **Never trust the redirect alone.** The status endpoint (already wired up)
  must confirm `ResponseCode = "00"` **and** that the returned amount matches
  before you deliver value — that's exactly what `api/links/[id]/status` does.
- Status codes seen: `00` approved · `Z25` transaction not found ·
  `Z1` amount inconsistency.
- The Pay Bill API has no description field — the description is stored in
  SQLite and included in the WhatsApp message; the checkout page shows your
  Pay Item name from the Quickteller dashboard.

## Scripts

```bash
npm run dev     # dev server (Turbopack)
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```
