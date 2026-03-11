# Supabase project setup

Use this guide after you’ve created a project in the [Supabase Dashboard](https://supabase.com/dashboard).

---

## 1. Get your project credentials

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Project Settings** (gear icon) → **API**.
3. Copy and keep these for the next steps:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (under “Project API keys”)

For running migrations from your machine (optional):

4. Go to **Project Settings** → **Database**.
5. Under **Connection string**, choose **URI** and copy it.  
   It looks like:  
   `postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`  
   Replace `[YOUR-PASSWORD]` with your database password (same one you set when creating the project).

---

## 2. Run the database SQL (in order)

In the Supabase Dashboard, open **SQL Editor** and run these files **in this order**.  
Each file is in the repo under `database/` or `database/migrations/`.

| Order | File | Purpose |
|-------|------|--------|
| 1 | `database/schema.sql` | Base tables, enums, triggers |
| 2 | `database/rls_policies.sql` | RLS helper functions and policies |
| 3 | `database/migrations/001_clients_and_org_profile.sql` | Clients, org profile, case fields |
| 4 | `database/migrations/001_clients_rls.sql` | RLS for clients |
| 5 | `database/migrations/002_case_number_sequence.sql` | Case number sequence |
| 6 | `database/migrations/003_onboarding_inbound_appointments_recordings_invoices.sql` | Onboarding, inbound, appointments, recordings, invoices |
| 7 | `database/migrations/003_rls.sql` | RLS for new tables |

**How to run each file**

- Click **New query** in the SQL Editor.
- Paste the full contents of the file (from this repo).
- Click **Run** (or Ctrl+Enter).
- Fix any errors before moving to the next file (e.g. “already exists” is usually safe to ignore for `IF NOT EXISTS` objects).

**Optional: run migrations from your machine**

If you have the **Database URI** from step 1.4:

```powershell
$env:DATABASE_URL = "postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"
.\run-migrations.ps1
```

Note: `run-migrations.ps1` only runs the **migration** files (3–7). You must still run **schema.sql** and **rls_policies.sql** once in the SQL Editor (steps 1–2).

---

## 3. Configure the apps

Use the **Project URL** and **anon public** key from step 1.

### Web app (`web-app`)

Create or edit `web-app/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

(Replace with your real URL and anon key.)

### Admin suite (`admin-suite`)

Create or edit `admin-suite/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Mobile app (`mobile-app`) – Expo

Create or edit `mobile-app/.env` (Expo reads this; use `EXPO_PUBLIC_` for client-side vars):

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Restart the Expo dev server after changing `.env`.

---

## 4. Auth and first user

- The apps use Supabase **Auth** (email/password or other providers you enable).
- **First user:** sign up via your app (e.g. web app `/login`) or create a user in Supabase Dashboard → **Authentication** → **Users** → **Add user**.
- To link a user to an organisation:
  1. Create an organisation (e.g. via your app’s onboarding or an API).
  2. Insert a row in `org_members`: `org_id`, `user_id` (the auth user’s UUID from Authentication → Users), `role` (e.g. `owner`).

If you need a quick test org and membership, you can run something like this once in the SQL Editor (replace the UUIDs):

```sql
-- Optional: create a test org and link the first auth user
INSERT INTO organisations (id, name, slug, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'My Org', 'my-org', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Then in Supabase Dashboard → Authentication → Users, copy your user's UUID and run:
-- INSERT INTO org_members (org_id, user_id, role)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'YOUR-USER-UUID-HERE', 'owner');
```

---

## 5. Storage (for uploads)

The app uses the **evidence** bucket for uploads (evidence, recordings, exports, org logos, etc.).

1. In Supabase Dashboard go to **Storage**.
2. Create a bucket named **evidence** (or match the name used in your code).
3. Set policies so that authenticated users in your app can read/write as required (e.g. by `org_id` or RLS).

---

## 6. Start the apps

From the project root:

```powershell
.\start-all-servers.ps1
```

This runs migrations (if `DATABASE_URL` is set) and opens three windows: Admin (port 3000), Web app (3004), and Expo (QR code for Expo Go).

- **Web:** http://localhost:3004  
- **Admin:** http://localhost:3000  
- **Mobile:** scan QR with Expo Go

---

## Quick checklist

- [ ] Project URL and anon key copied from Settings → API
- [ ] `schema.sql` run in SQL Editor
- [ ] `rls_policies.sql` run in SQL Editor
- [ ] All 5 migration files run in order (001, 001_rls, 002, 003, 003_rls)
- [ ] `web-app/.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `admin-suite/.env.local` has the same
- [ ] `mobile-app/.env` has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] First user created (Auth) and linked to an org in `org_members` (if needed)
- [ ] Storage bucket **evidence** created and policies set
