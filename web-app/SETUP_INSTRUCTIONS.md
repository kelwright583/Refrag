# Refrag Web App — Setup Instructions

## Prerequisites

- **Node.js 20+** — download from https://nodejs.org
- **npm** (bundled with Node.js)
- **Supabase account** — https://supabase.com (free tier works for development)
- **Supabase CLI** (optional, for local development) — `npm install -g supabase`

---

## 1. Install Dependencies

```bash
cd web-app
npm install
```

---

## 2. Environment Setup

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env.local
```

Open `.env.local` and set at minimum:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Project Settings > API |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL, or `http://localhost:3004` for local dev |

All other variables are optional — see `.env.example` for details on each.

---

## 3. Database Setup

Run the following SQL files in order in the **Supabase SQL Editor** (Dashboard > SQL Editor > New query):

1. `database/rebuild/001_master_schema.sql` — creates all tables, indexes, and sequences
2. `database/rebuild/002_rls_policies.sql` — applies row-level security policies

> These scripts are idempotent and safe to re-run.

---

## 4. Run Locally

```bash
npm run dev
```

The app runs on **http://localhost:3004** by default.

---

## 5. Deploy to Vercel

### One-time setup

```bash
npm install -g vercel
```

### Deploy

From the `web-app` directory:

```bash
vercel --prod
```

Vercel auto-detects Next.js. The `vercel.json` in this directory configures extended timeouts for PDF generation routes.

### Set Environment Variables

After deploying, add all variables from `.env.example` in the Vercel Dashboard:
**Project > Settings > Environment Variables**

At minimum, set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (your production URL, e.g. `https://app.refrag.com`)

---

## 6. PDF Generation on Vercel

PDF generation uses `@sparticuz/chromium` for serverless compatibility. Install it:

```bash
npm install @sparticuz/chromium
```

The PDF route (`/api/reports/[id]/generate-pdf`) already handles the Vercel/local detection automatically — no additional configuration needed for Vercel deployment.

For local development, the route uses the system Chromium. You can set `PLAYWRIGHT_EXECUTABLE_PATH` in `.env.local` to point to a specific binary if needed.

---

## 7. Optional Service Wiring

### Resend (Email Delivery)

1. Create an account at https://resend.com
2. Verify your sending domain
3. Generate an API key
4. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in your env

**Without this:** email delivery runs in dry-run mode — emails are logged to console but not sent. The `/api/cases/[id]/deliver-report` endpoint returns `dryRun: true`.

---

### OpenAI (AI Report Drafting)

1. Create an account at https://platform.openai.com
2. Generate an API key under API Keys
3. Set `OPENAI_API_KEY` in your env

**Without this:** the AI draft-section endpoint returns a 500 error. The UI should gracefully disable the "AI Draft" button when the API key is absent. Currently the route throws — consider guarding with a graceful fallback if needed.

---

### Google Cloud Vision (OCR)

1. Create a project at https://console.cloud.google.com
2. Enable the **Cloud Vision API**
3. Create a Service Account and download the JSON key
4. Paste the entire JSON on a single line into `GOOGLE_CLOUD_VISION_CREDENTIALS`

**Without this:** OCR endpoints return errors; the UI falls back to manual field entry.

---

### Stripe (Billing / Credit Gates)

1. Create an account at https://dashboard.stripe.com
2. Create Products and Price IDs for credit packs (5, 20, 50, 100 credits)
3. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the four `STRIPE_PRICE_ID_CREDITS_*` variables
4. For webhooks: run `stripe listen --forward-to localhost:3004/api/webhooks/stripe` in development

**Without this:** billing features and credit gates are disabled.

---

### Google Maps (Address Autocomplete)

1. Enable **Maps JavaScript API** and **Places API** in Google Cloud Console
2. Generate a browser API key (restrict it to your domain)
3. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in your env

**Without this:** address fields render as plain text inputs (no autocomplete or map preview).
