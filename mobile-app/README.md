# Refrag Mobile App

Professional workflow OS for assessors/inspectors - Mobile Field Capture App.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file with:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional: enable mock data toggles in Settings (omit for production)
# EXPO_PUBLIC_MOCK_MODE_ENABLED=true
```

3. Start the development server:
```bash
npm start
```

## Project Structure

```
app/                    # Routes (expo-router)
src/
  lib/                  # Core utilities
    supabase/           # Supabase client
    theme/              # Theme tokens
  store/                # State management (Zustand)
  components/           # Shared UI components
  features/             # Feature modules
```

## Tech Stack

- Expo React Native
- TypeScript
- Expo Router
- Supabase (Auth + Database + Storage)
- React Query (TanStack Query)
- Zustand
- Zod
