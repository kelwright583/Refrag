# Refrag Web App

Professional workflow OS for assessors/inspectors - Web Application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:

   **Option A – Test without Supabase (mock mode)**  
   Create a `.env.local` file with either nothing, or:
   ```
   NEXT_PUBLIC_USE_MOCK=true
   ```
   The app will use mock auth and data so you can test the UI. You’ll be treated as logged in and sent to the dashboard (or onboarding if you clear mock org state).

   **Option B – Use real Supabase**  
   Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
   Get the URL and anon key from your [Supabase](https://supabase.com) project → Settings → API.  
   If both are missing, the app automatically falls back to mock mode so you’re not stuck on “Loading”.

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
  app/                  # Next.js App Router pages
  components/           # React components
  lib/                  # Utilities and helpers
    supabase/          # Supabase clients (server + browser)
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database + Storage)
- Zod
- shadcn/ui (to be added)
