# Refrag Admin Suite

Internal control panel for Refrag staff to manage organisations, users, and platform operations.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) in your browser.

## Access

Only users with an active entry in the `staff_users` table can access the admin suite.

## Project Structure

```
src/
  app/
    admin/              # Admin routes
  lib/
    supabase/          # Supabase clients
    utils/             # Utilities (staff checks, etc.)
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database)
- Zod
