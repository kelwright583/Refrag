# Refrag Project Setup Instructions

This document provides step-by-step instructions to set up and run the Refrag project.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier is fine)
- Git

## Phase 1: Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key (found in Settings > API)

### 2. Run Database Migrations

1. Open the Supabase SQL Editor
2. Copy and paste the contents of `database/schema.sql`
3. Execute the SQL script
4. Copy and paste the contents of `database/rls_policies.sql`
5. Execute the RLS policies script

### 3. Set Up Storage Bucket

1. In Supabase Dashboard, go to Storage
2. Create a new bucket named `evidence`
3. Set it to public (or configure policies as needed)
4. Add storage policies for authenticated users

## Phase 2: Mobile App Setup

### 1. Navigate to Mobile App Directory

```bash
cd mobile-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `mobile-app` directory:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start Development Server

```bash
npm start
```

Follow the Expo CLI instructions to run on iOS simulator, Android emulator, or physical device.

## Phase 3: Web App Setup

### 1. Navigate to Web App Directory

```bash
cd web-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the `web-app` directory:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Phase 4: Admin Suite Setup

### 1. Navigate to Admin Suite Directory

```bash
cd admin-suite
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the `admin-suite` directory:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Create Staff User

Before accessing the admin suite, you need to create a staff user:

1. Create a regular user account via the web app or Supabase Auth
2. In Supabase SQL Editor, run:

```sql
INSERT INTO staff_users (user_id, role, is_active)
VALUES ('your_user_id_here', 'super_admin', true);
```

Replace `your_user_id_here` with the UUID from `auth.users` table.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) in your browser.

## Testing the Setup

### Test Database

1. Create a test organisation:
```sql
INSERT INTO organisations (name, slug)
VALUES ('Test Org', 'test-org');
```

2. Create a test user membership (replace user_id and org_id):
```sql
INSERT INTO org_members (org_id, user_id, role)
VALUES ('org_id_here', 'user_id_here', 'owner');
```

### Test Mobile App

1. Run the mobile app
2. Login with your test user credentials
3. You should see the organisation selection screen

### Test Web App

1. Run the web app
2. Login with your test user credentials
3. You should see the dashboard

### Test Admin Suite

1. Run the admin suite
2. Login with your staff user credentials
3. You should see the admin dashboard

## Next Steps

Refer to `REFRAG_PHASED_BUILD_PLAN.md` for the complete development roadmap.

## Troubleshooting

### Web app stuck on "Loading..."

1. Ensure `web-app/.env.local` exists with your real Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key`
2. Get these from Supabase Dashboard → Project Settings → API (Project URL and anon public key).
3. Restart the web app dev server after changing `.env.local`. If it still hangs, the root page will show an error message after ~10 seconds with a link to login.

### Mobile: "Could not connect to the development server"

Expo Go on your phone must reach the Metro bundler on your PC:

1. **Same Wi‑Fi:** Phone and PC should be on the same wireless network. Avoid guest networks that block device-to-device traffic.
2. **Tunnel (if same Wi‑Fi doesn’t work):** In the mobile-app folder run `npx expo start --tunnel`. Scan the new QR code; the app will load over the internet (slower but works across networks and firewalls).
3. **Windows Firewall:** If prompted, allow Node.js or the terminal app through the firewall when Expo starts.

### RLS Policy Errors

If you encounter RLS policy errors:
1. Verify that `is_org_member()` function exists
2. Check that user is properly added to `org_members` table
3. Ensure RLS policies were executed successfully

### Authentication Issues

1. Verify Supabase URL and keys are correct
2. Check that email/password auth is enabled in Supabase
3. Ensure user exists in `auth.users` table

### Storage Issues

1. Verify `evidence` bucket exists
2. Check storage policies allow authenticated uploads
3. Ensure RLS policies allow access to evidence table

## Support

For issues or questions, refer to the project documentation or Supabase documentation.
