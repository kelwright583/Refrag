# Testing Without Supabase

This guide explains how to test the Refrag application UI and components without requiring a Supabase connection.

## Quick Start

### 1. Enable Mock Mode

Create or update `.env.local` in the `web-app` directory:

```bash
NEXT_PUBLIC_USE_MOCK=true
```

### 2. Start the Development Server

```bash
cd web-app
npm run dev
```

### 3. Access the App

Open [http://localhost:3000](http://localhost:3000) in your browser.

You can now:
- ✅ View the UI and components
- ✅ Navigate between pages
- ✅ See mock data (cases, evidence, etc.)
- ✅ Test form interactions
- ✅ Test error boundaries
- ✅ Test loading states

## What Works in Mock Mode

### ✅ Fully Functional
- **UI Components**: All React components render correctly
- **Navigation**: All routes work
- **Forms**: Form inputs and validation work
- **Styling**: Tailwind CSS and theme work
- **Error Boundaries**: Error handling displays correctly
- **Loading States**: Loading indicators work

### ⚠️ Limited Functionality
- **Authentication**: Mock login accepts any credentials
- **Data**: Uses pre-defined mock data (see `web-app/src/lib/mocks/data.ts`)
- **API Calls**: Returns mock responses
- **File Uploads**: Not functional (would require Supabase Storage)
- **Real-time Updates**: Not functional

## Mock Data

Mock data is defined in `web-app/src/lib/mocks/data.ts`:

- **3 mock cases** with different statuses
- **2 mock evidence items** (photo and video)
- **1 mock mandate** with requirements
- **1 mock report**

You can modify this file to add more test data or change existing data.

## Customizing Mock Data

Edit `web-app/src/lib/mocks/data.ts` to customize:

```typescript
export const mockCases: Case[] = [
  {
    id: 'case-1',
    org_id: mockOrg.id,
    case_number: 'TEST-ORG-2024-0001',
    client_name: 'Your Test Client',
    // ... more fields
  },
  // Add more cases...
]
```

## Testing Different Scenarios

### Test Empty States
Modify mock data arrays to be empty:

```typescript
export const mockCases: Case[] = []
```

### Test Error States
The error boundary will catch any errors. You can also modify the mock Supabase client to return errors.

### Test Loading States
The UI will show loading states naturally as mock data loads.

## Limitations

1. **No Real Database**: Changes aren't persisted
2. **No File Storage**: Evidence uploads won't work
3. **No Real Authentication**: Any credentials work
4. **No Real-time**: No live updates
5. **Limited API**: Only basic CRUD operations mocked

## Switching Back to Real Supabase

1. Remove or set `NEXT_PUBLIC_USE_MOCK=false` in `.env.local`
2. Ensure your Supabase credentials are configured:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```
3. Restart the development server

## Mobile App Testing

For the mobile app, you would need to create similar mocks. The current mock setup is focused on the web app.

## Next Steps

- Add more mock data scenarios
- Create mock API route handlers
- Add mock file upload simulation
- Create mock real-time subscriptions
