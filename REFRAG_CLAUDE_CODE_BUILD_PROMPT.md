# REFRAG — CLAUDE CODE MASTER BUILD PROMPT
**Version:** 1.0  
**Date:** March 2026  
**Purpose:** Single comprehensive prompt to take Refrag from its current state to a fully working, launchable product. Read this entire document before writing a single line of code.

---

## HOW TO USE THIS PROMPT

1. Read every section in full before starting.
2. Read the existing codebase — particularly `PROJECT_STATUS.md`, `REFRAG_PROJECT_SPEC.md`, `REFRAG_VISION_AND_TARGET_STATE.md`, and the `web-app/src` directory tree — before making any changes.
3. Work through sections **in the order presented**. Each section builds on the last.
4. Do not skip sections marked **BLOCKING** — later work depends on them.
5. When a section says "implement fully", it means production-quality, connected to real data, no placeholders, no "will be rendered here" stubs.

---

## AUDIT FINDINGS — CURRENT STATE SUMMARY

Before building, understand exactly what exists and what does not.

**What is genuinely complete and working:**
- Database schema (`database/rebuild/001_master_schema.sql` and `002_rls_policies.sql`)
- Supabase auth, RLS, multi-tenant org model
- Onboarding wizard (6-step)
- Client management (CRUD, rate structures, rules)
- Mandate builder with drag-and-drop requirements
- Report builder component (`web-app/src/components/report/ReportBuilder.tsx`) — built but not wired into the case workspace
- Section editor with AI draft capability (`SectionEditor.tsx`) — built but not wired
- Billing system structure (Stripe stubs, credit gate logic)
- Platform event instrumentation
- Admin suite (analytics, orgs, users, audit)
- PWA basics (manifest.json, sw.js, icons) — exist but need enhancement
- Motor assessment tabs: `InstructionTab`, `VehicleDetailsTab`, `TyresTab`, `DamagesLabourTab`, `PartsAssessmentTab`, `MMCodesValuesTab`, `PhotosEvidenceTab`, `OutcomeFinancialsTab`, `FindingsTab` — these are implemented under `web-app/src/components/assessment/` and connected at `/app/cases/[id]/assessment/`
- Evidence upload page at `/app/cases/[id]/evidence/` — implemented with drag-drop, tagging, AI classification hooks
- Stationery settings page — implemented at `/app/settings/stationery/`
- Comms trigger system, email preview panel, templates

**What is stubbed and not functional (the 30 case workspace sections):**
Every file in `web-app/src/components/case/sections/` is a 22-line stub returning a placeholder `div`. These include `EvidenceGridSection`, `DamageLabourSection`, `PartsAssessmentSection`, `TyreGridSection`, `VehicleValuesSection`, `InstructionDetailsSection`, `FindingsListSection`, `RedFlagsSection`, `InvestigationTimelineSection`, `TimeDisbursementsSection`, `PartiesStatementsSection`, `ReportBuilderSection`, `ReportPreviewSection`, `PackBuilderSection`, `InvoiceBuilderSection`, `MandateChecklistSection`, `MandateProgressSection`, `CaseNotesSection`, `ContactsSection`, and all others.

**What is missing entirely:**
- Investigator workflow (findings, red flags, timeline, parties, time & disbursements) — schema exists, no UI
- Signature capture on reports
- GPS/location stamping on evidence
- Offline read-cache for the field PWA
- Continuous/rapid multi-photo capture mode
- Report delivery (email with attachment) — Resend not wired
- Report pack download — ZIP generation stubbed
- PWA field routes optimised for mobile (the web app exists but is not optimised for phone-screen field use)

---

## SECTION 1 — PWA FIELD APP (BLOCKING — DO THIS FIRST)

**Context:** The native mobile app (Expo/React Native in `mobile-app/`) is being retired for MVP. The web app (`web-app/`) already has `manifest.json`, `sw.js`, and PWA icons. The goal is to create a fully mobile-optimised field experience within the Next.js web app that field users (assessors and investigators) can add to their home screen and use on-site.

### 1.1 PWA Infrastructure Enhancement

The existing `public/sw.js` is minimal. Replace it with a proper service worker:

```
public/sw.js — rewrite entirely
```

The new service worker must:
- Use a versioned cache name (`refrag-v2`) to force update on deploy
- On install: pre-cache `/`, `/login`, `/app/dashboard`, `/app/cases`, `/offline` and all static assets
- On fetch: implement a **network-first with cache fallback** strategy for API routes (`/api/*`) — try network, on failure serve stale cache if available
- On fetch: implement a **cache-first with network update** strategy for static assets (`/_next/static/*`, images, fonts)
- On fetch: for navigation requests to `/app/*` routes — serve the cached shell if offline, so the app loads even without connectivity
- Register a Background Sync queue named `refrag-evidence-queue` for queued evidence uploads that failed due to connectivity
- Expose a `SKIP_WAITING` message handler so new service workers activate immediately when the user refreshes
- Handle the `activate` event: delete all caches with names not matching the current version

In `web-app/src/app/layout.tsx` (or a dedicated `ServiceWorkerRegistration` client component), add service worker registration:
- Register `/sw.js` on mount (client-side only, check `'serviceWorker' in navigator`)
- Listen for `controllerchange` to prompt the user when a new version is available ("Update available — tap to refresh")
- Show a subtle banner (not a modal) with a "Refresh" button when an update is detected

In `public/manifest.json`:
- Change `start_url` to `/app/dashboard`
- Add `"display_override": ["standalone", "minimal-ui"]`
- Add `"orientation": "portrait"`
- Add `"scope": "/"`
- Add `"shortcuts"` array with at minimum: `{ name: "New Case", url: "/app/cases?new=1" }` and `{ name: "Capture", url: "/app/field/capture" }`
- Add `"categories": ["productivity", "business"]`

### 1.2 Field Route Group

Create a new Next.js route group: `web-app/src/app/field/`

This group is the mobile-optimised field experience. It shares the same Supabase auth and data as the main web app but uses a different layout optimised for phone screens. Field routes are NOT a separate app — they use all the same hooks, API routes, and components as the web app.

**Layout:** `web-app/src/app/field/layout.tsx`
- Full-height, no desktop sidebar
- Bottom navigation bar with 5 tabs: Dashboard (home icon), Cases (folder icon), Capture (camera icon), Calendar (calendar icon), Profile (user icon)
- Bottom nav must be `position: fixed; bottom: 0` with `padding-bottom: env(safe-area-inset-bottom)` for iPhone home bar
- Top: minimal header bar showing "Refrag" logo and org name only — no desktop nav
- Background: white. Tab bar background: white with a top border `#D4CFC7`
- Active tab: copper/primary colour icon + label. Inactive: slate grey
- The entire layout must feel native — no desktop chrome, no sidebars, no breadcrumbs

**Field routes to create:**

`/app/field/dashboard` — Field dashboard  
`/app/field/cases` — Case list  
`/app/field/cases/[id]` — Case detail  
`/app/field/capture` — Capture hub  
`/app/field/calendar` — Calendar/appointments  
`/app/field/profile` — Profile

Each route is detailed in sub-sections below.

### 1.3 Field Dashboard (`/app/field/dashboard`)

Show:
- Greeting: "Good morning, [first name]" (time-aware: morning/afternoon/evening)
- Today's date in a readable format
- Stats row: open cases count, cases due this week, pending uploads count (from upload queue)
- "Recent Cases" list — last 5 cases the user touched, showing case number, client name, status badge, and time ago. Tapping navigates to `/app/field/cases/[id]`
- "Today's Appointments" — pulls from the appointments table for today. Shows time, case reference, location. If none: "No appointments today"
- FAB (floating action button) in bottom-right: "+" that opens a quick-action sheet with: "New Case" and "Quick Capture"

Use existing hooks: `useCases`, `useAppointments`. These already connect to Supabase.

### 1.4 Field Case List (`/app/field/cases`)

- Search bar at top (debounced, filters by case number and client name)
- Filter chips below search: All | Open | Site Visit | Reporting (maps to status values)
- Case cards: case number (bold), client name, insurer name (muted), status badge (colour-coded), loss date, priority indicator (coloured left border: red=high, grey=low)
- Pull-to-refresh using the `RefreshControl` equivalent in web — add a pull-to-refresh gesture using IntersectionObserver or a simple scroll-position trigger showing a spinner at the top
- Empty state with illustration placeholder and "No cases found" message
- FAB: "+" to create new case (opens `CreateCaseModal` adapted for mobile — full-screen sheet on mobile rather than a centred modal)

### 1.5 Field Case Detail (`/app/field/cases/[id]`)

This is the heart of the field experience. Show:

**Header section:**
- Case number (large, bold)
- Client name
- Status selector — horizontal scrollable pill row showing all statuses; active status is highlighted. Tapping a status updates it immediately with optimistic UI
- Priority badge

**Tab bar (horizontal scroll, not bottom nav — that's for the app shell):**
- Overview | Evidence | Mandate | Notes

**Overview tab:**
- Instruction details: insurer name, claim reference, loss date, location
- Risk item summary (vehicle/property details pulled from risk_items table)
- Contacts: insured phone (tap to call using `tel:` link), email (tap to compose)
- Map preview: if location is set, show a static map using Google Maps Static API (`maps.googleapis.com/maps/api/staticmap`) — a simple `<img>` tag, no JS map library needed for static preview. Tap to open in Google Maps/Apple Maps via universal link

**Evidence tab:**
- Grid of captured evidence (2 columns of thumbnails)
- Upload queue status: "3 pending upload" banner if items are queued
- "+" button opens the capture flow (see Section 1.6)
- Each thumbnail: tap to view full-size in a lightbox. Long-press or swipe to reveal delete option
- Show AI-assigned tags as small chips on each thumbnail
- Empty state: camera icon + "No evidence yet — tap + to capture"

**Mandate tab:**
- The assigned mandate name (if any), or "No mandate assigned" with an "Assign" button
- Checklist of requirements: each row shows requirement label, evidence type icon, status (missing/provided/N/A)
- Tapping a "missing" requirement opens the capture flow pre-tagged with that requirement
- Progress bar: X of Y requirements met
- Swipe right on a requirement to mark as N/A

**Notes tab:**
- Chronological list of case notes (markdown rendered as plain text for simplicity)
- "+" button opens a full-screen text input with "Add Note" and "Cancel" actions
- Each note shows: author name, time ago, note body

### 1.6 Field Capture (`/app/field/capture`)

This is the camera/upload hub. It must work entirely via the browser's native file input — no native camera library.

**Capture methods:**

1. **Camera** (primary): A large "Take Photo" button. On click, trigger:
   ```html
   <input type="file" accept="image/*" capture="environment" multiple />
   ```
   The `capture="environment"` attribute opens the rear camera directly on mobile. `multiple` allows selecting multiple photos in one session on supporting devices.

2. **Gallery**: "Choose from Gallery" button. Trigger:
   ```html
   <input type="file" accept="image/*,video/*,application/pdf" multiple />
   ```

3. **Document**: "Upload Document" button. Trigger:
   ```html
   <input type="file" accept=".pdf,.doc,.docx,.xlsx,.jpg,.png" multiple />
   ```

All three inputs are hidden `<input>` elements triggered programmatically via `ref.current.click()`.

**After file selection:**
- Show a preview grid of selected files (image thumbnails, or file icon + name for documents)
- "Case" selector: dropdown/sheet showing recent cases + search. Required before upload
- Tag chips: show suggested tags (VIN, ODOMETER, FRONT, REAR, LEFT, RIGHT, UNDERCARRIAGE, ENGINE, INTERIOR, CHASSIS, DAMAGE_CLOSEUP, DAMAGE_WIDE, STATEMENT, QUOTE, INVOICE). User can tap multiple. Custom tag via text input
- "Notes" text input (optional)
- "Upload" button: enqueues all selected files to the upload queue (IndexedDB — see Section 1.9)
- Show per-file upload progress

**Upload queue status banner** (shown when items are pending):
- Persistent banner at top of capture screen: "Uploading 3 of 7 — tap for details"
- Tap opens a sheet showing each queued item with status (pending/uploading/failed), file name, and a retry button for failed items

**Rapid capture mode:** After a successful upload, the file inputs reset so the user can immediately capture another photo without leaving the screen. The case and tags from the previous capture are pre-populated for the next one (saves time in the field).

### 1.7 Field Calendar (`/app/field/calendar`)

- Day view by default (assessors care about today)
- Week toggle available
- Shows appointments from the `appointments` table
- Each appointment: time block, case reference (tappable — navigates to case detail), location, notes
- "+" FAB to create appointment: opens a form sheet with fields for date, time, case (searchable), location (with Google Places autocomplete if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set, otherwise plain text input), and notes
- Today's appointments highlighted
- If location is set on an appointment, show a "Navigate" button that opens the address in Google Maps via universal link (`https://maps.google.com/?q=ADDRESS`)

### 1.8 Field Profile (`/app/field/profile`)

- Display name, email, org name
- "Switch Organisation" if user belongs to multiple orgs
- App version displayed
- "Switch to Desktop" link — navigates to `/app/dashboard`
- Sign out button

### 1.9 IndexedDB Upload Queue (replaces expo-sqlite)

The native app uses `expo-sqlite` for the upload queue. The PWA needs an equivalent using IndexedDB.

Create `web-app/src/lib/upload/field-upload-queue.ts`:

```typescript
// Interface must match the existing evidence upload API
interface QueueItem {
  id: string                    // uuid
  localFileUri: string          // blob URL or base64
  fileName: string
  fileSize: number
  contentType: string
  mediaType: 'photo' | 'video' | 'document'
  caseId: string
  orgId: string
  tags: string[]
  notes: string
  capturedAt: string            // ISO string
  locationLat?: number
  locationLng?: number
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
  retryCount: number
  lastError?: string
  createdAt: string
}
```

Implementation requirements:
- Use the `idb` library (`npm install idb`) — do not use raw IndexedDB API
- Database name: `refrag-upload-queue`, store name: `queue`, version: 1
- Provide functions: `enqueue(item)`, `getAll()`, `getByStatus(status)`, `updateStatus(id, status, error?)`, `remove(id)`, `getStats()` returning `{ pending, uploading, failed, uploaded }`
- The queue processor (`web-app/src/lib/upload/field-queue-processor.ts`) must:
  - Run max 3 concurrent uploads
  - On failure: exponential backoff (retry after 30s, then 2min, then 10min, then 30min — max 4 retries)
  - Upload via the existing evidence upload API: `POST /api/evidence/upload` (create this route if it does not exist — it should accept multipart/form-data with the file + metadata and insert into the `evidence` table via Supabase Storage)
  - After successful upload: mark item as `uploaded`, then remove from queue after 5 minutes (keep briefly for UI confirmation)
  - Trigger sync on: page visibility change (`document.addEventListener('visibilitychange')`), online event (`window.addEventListener('online')`), and a 30-second interval while the page is visible
  - Store blob URLs as `blob:` references while queued — these are in-memory, so if the page is closed before upload, the item stays in IndexedDB but the blob is gone. Handle this gracefully: if the blob is no longer accessible on retry, mark the item as `failed` with error "File no longer available — please recapture"

Create a React hook: `web-app/src/hooks/use-field-upload-queue.ts`
- Returns `{ items, stats, enqueue, retry, clear }`
- Subscribes to queue changes via a polling interval (every 2 seconds while visible) or BroadcastChannel if available
- Used by the capture screen and the upload queue status banner

### 1.10 Geolocation on Evidence

When a user captures evidence in the field, stamp it with GPS coordinates.

In the capture flow, on page load (or when the user first opens the capture tab):
- Call `navigator.geolocation.getCurrentPosition()` with a 10-second timeout
- Store the result (`latitude`, `longitude`, `accuracy`) in component state
- When enqueuing an upload, include `locationLat` and `locationLng` if available
- Show a small "📍 Location captured" indicator near the capture button if geolocation succeeded, or "📍 Location unavailable" (muted) if it failed — do not block the user if geolocation fails
- The `evidence` table already has columns for this — ensure the upload API route writes them

### 1.11 PWA Install Prompt

Create a `PWAInstallBanner` component shown at the top of the field layout (dismissable, persisted in localStorage so it only shows once):

- Text: "Add Refrag to your home screen for the best experience"
- "Add" button: triggers the deferred `beforeinstallprompt` event
- "×" dismiss button
- Only show on mobile browsers (detect via `window.matchMedia('(max-width: 768px)')` AND `!window.matchMedia('(display-mode: standalone)').matches`)

---

## SECTION 2 — CASE WORKSPACE SECTIONS (BLOCKING)

**Context:** All 30 files in `web-app/src/components/case/sections/` are stubs. Each must be fully implemented. The `CaseWorkspace` component at `web-app/src/components/case/CaseWorkspace.tsx` renders these sections based on the vertical config. The sections receive `caseId: string` and `orgSettings: any` as props.

Before implementing each section, read:
- `web-app/src/lib/verticals/config.ts` — to understand which sections appear for which verticals
- `web-app/src/lib/types/` — for all type definitions
- `web-app/src/hooks/` — existing hooks for data fetching (use these; do not create new API routes unless one genuinely doesn't exist)
- `web-app/src/components/assessment/shared.tsx` — for the `Field`, `Section`, `Input`, `Select`, `CurrencyInput` shared UI primitives (use these for consistency)

### 2.1 InstructionDetailsSection

**File:** `web-app/src/components/case/sections/InstructionDetailsSection.tsx`  
**Verticals:** All

Fetch the case using `useCase(caseId)`. Render a read-only summary of instruction details with an inline edit mode:

Fields to display/edit:
- Insurer name
- Claim reference / insurer file number
- Instructing party (broker or direct)
- Date of instruction (from `created_at`)
- Date of loss
- Nature of loss / instruction description (free text, stored in `case_notes` or a dedicated field — use `description` if it exists on cases, otherwise use the first case note with type `instruction`)
- Priority

Edit mode: show form inputs inline. "Edit" button toggles to form. "Save" / "Cancel" buttons. Use `useUpdateCase` hook.

### 2.2 VehicleSummarySection

**File:** `web-app/src/components/case/sections/VehicleSummarySection.tsx`  
**Verticals:** motor_assessor, loss_adjuster

Fetch risk items for the case using `useRiskItems(caseId)`. Filter to type `motor_vehicle`.

Display the primary vehicle risk item fields:
- Make, Model, Year, Colour
- VIN / Engine number
- Registration number
- Odometer reading
- Transmission type (manual/automatic)
- General condition (pre-loss)

If no vehicle risk item exists: show "No vehicle added" with an "Add Vehicle" button that opens an inline form to create a `risk_item` of type `motor_vehicle` (upsert via `useCreateRiskItem` or equivalent — create this hook if it doesn't exist, calling `POST /api/cases/[caseId]/risk-items`).

Edit inline — same edit/save pattern as InstructionDetailsSection.

### 2.3 PropertySummarySection

**File:** `web-app/src/components/case/sections/PropertySummarySection.tsx`  
**Verticals:** property_assessor, loss_adjuster

Same pattern as VehicleSummarySection but for risk items of type `building`, `contents`, `stock`, or `business_interruption`.

Fields:
- Property address (full)
- Erf/stand number
- Property type (residential/commercial/industrial/other)
- Construction type (brick/timber/steel frame/other)
- Roof type
- Sum insured (building), sum insured (contents)
- Year built (approximate)
- Occupancy status at time of loss

### 2.4 ReferralDetailsSection

**File:** `web-app/src/components/case/sections/ReferralDetailsSection.tsx`  
**Verticals:** investigator, loss_adjuster

Fields:
- Referral source (insurer / SIU / attorney / broker / other)
- Referral date
- Mandate scope (free text)
- Specific questions to address (free text, multi-line)
- Confidentiality classification (standard / confidential / strictly confidential)
- SIU reference number (if applicable)

### 2.5 PartiesSummarySection

**File:** `web-app/src/components/case/sections/PartiesSummarySection.tsx`  
**Verticals:** investigator, loss_adjuster

Fetch parties from `case_contacts` using `useCaseContacts(caseId)` (create hook if needed, calling `GET /api/cases/[caseId]/contacts`).

Display a list of parties with type badge (Insured / Broker / Insurer / Panelbeater / Other — use existing `ContactType` enum). Each party shows name, phone (tappable on mobile), email, and role.

"Add Party" button opens an inline form. "Remove" button with confirmation. Edit inline.

For investigator vertical, also show a "Subject" category with fields: subject name, ID number, relationship to claim, current status (active subject / witness / cleared).

### 2.6 ContactsSection

**File:** `web-app/src/components/case/sections/ContactsSection.tsx`  
**Verticals:** All

Same data source as PartiesSummarySection but rendered as a compact contact card list for the Overview tab. Each card:
- Name (bold)
- Type badge
- Phone: `<a href="tel:...">` link
- Email: `<a href="mailto:...">` link
- "Copy" button for each

Compact, read-only. Link to full parties management.

### 2.7 MandateProgressSection

**File:** `web-app/src/components/case/sections/MandateProgressSection.tsx`  
**Verticals:** All

Fetch case mandates and requirement checks using `useCaseMandates(caseId)` and `useRequirementChecks(caseId)`.

Show:
- Mandate name (or "No mandate assigned" with assign link)
- Progress bar: X of Y requirements met (colour: red if <50%, amber if 50-79%, green if ≥80%)
- Mini checklist (collapsed by default, expandable): each requirement with its status icon and label
- "View full checklist" link that scrolls to or navigates to the MandateChecklistSection / Mandate tab

### 2.8 CaseNotesSection

**File:** `web-app/src/components/case/sections/CaseNotesSection.tsx`  
**Verticals:** All

Fetch notes using `useCaseNotes(caseId)`. Render chronological list (newest first):
- Author name + avatar initials (first letter of first name, coloured background)
- Time ago (e.g., "2 hours ago", "Yesterday at 3:45pm")
- Note body (render markdown as plain text — just `body_md` without markdown parsing for simplicity in the overview)

"+ Add Note" button: inline textarea that expands. "Save" button calls `useCreateCaseNote`. "Cancel" collapses.

Character limit: 2000. Show character count when within 200 of limit.

### 2.9 TimelineSection

**File:** `web-app/src/components/case/sections/TimelineSection.tsx`  
**Verticals:** All (especially investigator)

Fetch from `platform_events` filtered by `case_id`. Also pull `audit_log` entries. Combine and sort chronologically (newest first).

Each timeline entry:
- Icon based on event type (e.g., case created → folder icon, evidence uploaded → camera icon, status changed → arrow icon, note added → pencil icon, mandate assigned → clipboard icon, report generated → document icon)
- Event description (human-readable: "Status changed from Draft to Assigned", "3 photos uploaded", "Note added by [name]", etc.)
- Timestamp (absolute for events older than 24h, relative for recent)
- Actor name

For investigator vertical this is especially important — it functions as a chain-of-custody log. Make it visually prominent with a vertical line connecting events.

### 2.10 EvidenceGridSection

**File:** `web-app/src/components/case/sections/EvidenceGridSection.tsx`  
**Verticals:** All

This is the primary evidence view in the Capture tab. It must be fully functional.

Fetch evidence using `useEvidence(caseId)`. Fetch signed URLs using `useEvidenceSignedUrls(evidence)`.

Render:
- Filter bar: All | Photos | Videos | Documents — filter chips
- Upload zone: drag-and-drop area at the top (desktop) OR a camera button + file picker (mobile). On file drop/select, call `useUploadEvidence` with the file and case ID. Show upload progress per file
- Evidence grid: 3 columns on desktop, 2 on tablet/mobile. Each card:
  - Thumbnail (image) or file type icon (document/video)
  - AI classification tags as chips (from `evidence_tags`)
  - File name (truncated)
  - Upload date
  - Hover/tap: show overlay with "View", "Tag", "Delete" actions
- Lightbox: clicking a photo shows it full-size with navigation arrows (prev/next)
- Tagging modal: shows current tags, suggested tags (same list as capture), custom tag input, save button
- Delete: confirmation required. Use `useDeleteEvidence`
- Empty state: dashed border box with upload icon and "Drop files here or click to upload"

For camera capture specifically (on mobile within the PWA): include a "Take Photo" button that triggers `<input type="file" accept="image/*" capture="environment" />` as per Section 1.6.

Show upload queue badge if items are pending: "2 uploading..." banner.

### 2.11 ValuationDropSection

**File:** `web-app/src/components/case/sections/ValuationDropSection.tsx`  
**Verticals:** motor_assessor, loss_adjuster

A document drop zone specifically for valuation printouts (Lightstone, TransUnion, Glass's, etc.).

- Drag-and-drop zone labelled "Drop valuation printout here (PDF or image)"
- On file drop: upload to Supabase Storage under `org_id/cases/case_id/valuations/`. Create an `intake_documents` record with `source_type: 'pdf_upload'`
- If OCR is configured (`GOOGLE_CLOUD_VISION_CREDENTIALS` env var present): trigger OCR pipeline via `POST /api/intake/process`. Show extraction status: "Extracting..." → "Review extracted values"
- If OCR is not configured (stub mode): show "Document uploaded — OCR not configured. Values must be entered manually below"
- Manual entry fields below: Retail value, Trade value, Market value, Source (Lightstone / TransUnion / Glass's / Other), Date of valuation
- "Save values" button: writes to `vehicle_values` table (or updates the risk item's valuation fields)
- Show previously saved values if they exist

### 2.12 RepairerQuoteDropSection

**File:** `web-app/src/components/case/sections/RepairerQuoteDropSection.tsx`  
**Verticals:** motor_assessor, loss_adjuster

Same pattern as ValuationDropSection:
- Drop zone: "Drop repairer quote here (PDF)"
- OCR pipeline trigger if configured
- Manual entry fallback fields: Repairer name, Quote number, Quote date, Quoted amount (currency input), Validity period, Parts total, Labour total, Paint total, Miscellaneous total
- "Save" writes to the `repair_assessment` record

### 2.13 PartsQuoteDropSection

**File:** `web-app/src/components/case/sections/PartsQuoteDropSection.tsx`  
**Verticals:** motor_assessor, loss_adjuster

- Drop zone: "Drop parts quote here"
- Manual fields: Supplier name, Quote number, Quote date, list of parts (description + part number + price) — add rows dynamically
- "Save" writes to `parts_assessment` record

### 2.14 ContractorQuoteDropSection

**File:** `web-app/src/components/case/sections/ContractorQuoteDropSection.tsx`  
**Verticals:** property_assessor, loss_adjuster

- Drop zone: "Drop contractor quote here"
- Manual fields: Contractor name, registration number, quote number, date, scope of works (free text), total amount (currency), breakdown by category (building repairs, electrical, plumbing, roofing, other — add rows)
- "Save" writes to `contractor_quotes` table (create if needed) or stores in case notes if table doesn't exist yet

### 2.15 ContentsListDropSection

**File:** `web-app/src/components/case/sections/ContentsListDropSection.tsx`  
**Verticals:** property_assessor, loss_adjuster

- Drop zone: "Drop contents list here (PDF, Excel, Word)"
- Manual entry: a table with columns — Item description, Quantity, Replacement value, Age/condition, Depreciation %, Net value. Add rows dynamically
- Running total shown below the table
- "Save" writes to `contents_inventory` table (or jsonb field on the case)

### 2.16 StatementUploadSection

**File:** `web-app/src/components/case/sections/StatementUploadSection.tsx`  
**Verticals:** investigator, loss_adjuster

- Drop zone: "Drop statement documents here"
- Each uploaded statement: record who provided it, date obtained, type (sworn/unsworn/written/verbal summary)
- "Record verbal statement" option: opens a text area to type a summary (no audio recording required — just structured text note)
- List of all statements with download links (signed URLs)
- "New statement" button for adding manual records

### 2.17 DocumentLogSection

**File:** `web-app/src/components/case/sections/DocumentLogSection.tsx`  
**Verticals:** All

All documents attached to the case (from `intake_documents` and `evidence` where `media_type = 'document'`), shown as a log:
- Filename
- Document type (quote / valuation / statement / mandate / correspondence / other) — user can categorise
- Date added
- Added by
- Download link (signed URL)
- "Remove" option

Sorting: newest first. Filter by document type.

### 2.18 MandateChecklistSection

**File:** `web-app/src/components/case/sections/MandateChecklistSection.tsx`  
**Verticals:** All

Full mandate checklist view (more detailed than MandateProgressSection):
- "Assign Mandate" button at top if none assigned — opens the mandate selection modal (reuse `MandateSelectionModal` from mobile, or create equivalent)
- For each requirement:
  - Requirement label (bold)
  - Description (muted, collapsible)
  - Evidence type required (icon + label)
  - Required / Optional badge
  - Status toggle: Missing → Provided → N/A (click to cycle)
  - "Attach Evidence" button: opens the evidence picker to link an existing evidence item
  - If evidence is attached: show the thumbnail/filename with a "×" to detach
- Group requirements by category if categories exist
- Progress summary at bottom: "X of Y required items completed"

### 2.19 DamageLabourSection (Assessment Tab)

**File:** `web-app/src/components/case/sections/DamageLabourSection.tsx`  
**Verticals:** motor_assessor, loss_adjuster

**This section should render the existing `DamagesLabourTab` component** (from `web-app/src/components/assessment/DamagesLabourTab.tsx`) within the case workspace. However, `DamagesLabourTab` requires a `FullMotorAssessment` object.

Bridge implementation:
1. Fetch assessments for the case using `useAssessmentsForCase(caseId)`
2. If no assessment exists: show "No assessment started" with a "Start Assessment" button that creates one via `useCreateAssessment`
3. If an assessment exists: fetch the full assessment via `useAssessment(id)` and render `<DamagesLabourTab assessment={fullAssessment} onNavigate={() => {}} />`
4. If multiple assessments exist: show a selector (Initial / Supplementary / Re-inspection) before rendering

Apply the same bridge pattern to sections 2.20–2.24 below.

### 2.20 PartsAssessmentSection

**File:** `web-app/src/components/case/sections/PartsAssessmentSection.tsx`  
**Verticals:** motor_assessor, loss_adjuster

Bridge to `<PartsAssessmentTab assessment={fullAssessment} onNavigate={() => {}} />` using same pattern as 2.19.

### 2.21 TyreGridSection

**File:** `web-app/src/components/case/sections/TyreGridSection.tsx`  
**Verticals:** motor_assessor, loss_adjuster

Bridge to `<TyresTab assessment={fullAssessment} onNavigate={() => {}} />`.

### 2.22 VehicleValuesSection

**File:** `web-app/src/components/case/sections/VehicleValuesSection.tsx`  
**Verticals:** motor_assessor, loss_adjuster

Bridge to `<MMCodesValuesTab assessment={fullAssessment} onNavigate={() => {}} />`.

### 2.23 PropertyDamageSectionsSection

**File:** `web-app/src/components/case/sections/PropertyDamageSectionsSection.tsx`  
**Verticals:** property_assessor, loss_adjuster

A room-by-room / area-by-area damage capture form. No existing component to bridge to — implement fresh:

- "Add Damage Area" button: opens an inline form with fields: Area name (kitchen/bathroom/bedroom/lounge/roof/exterior/other + custom), Damage description (free text), Cause (storm/fire/water/impact/other), Severity (minor/moderate/severe/total loss), Estimated reinstatement cost (currency input)
- List of all added damage areas as expandable cards
- Each card: area name, severity badge, cost, description, edit/delete actions
- Total estimated damage at the bottom
- Save each area to the `property_damage_areas` jsonb field on the case (or a dedicated table if one exists in the schema)

### 2.24 ContractorQuotesSection

**File:** `web-app/src/components/case/sections/ContractorQuotesSection.tsx`  
**Verticals:** property_assessor, loss_adjuster

Display contractor quotes that have been uploaded (from ContractorQuoteDropSection) or manually entered. Show:
- Contractor name + registration
- Quote amount
- Selected / not selected indicator
- Comparison table if multiple quotes
- "Recommended contractor" selection with reason field
- Note field for assessment notes on the quotes

### 2.25 ReinstatementValuesSection

**File:** `web-app/src/components/case/sections/ReinstatementValuesSection.tsx`  
**Verticals:** property_assessor, loss_adjuster

Financial summary for property:
- Building reinstatement value (currency input)
- Contents replacement value (currency input)
- Sum insured (pulled from risk item)
- Under-insurance calculation (automatic: `(assessed / sum_insured) * 100`)
- Average/co-insurance flag and amount
- Excess (currency input)
- Betterment deduction (currency input + percentage)
- VAT (calculated from org settings — use `formatCurrency` and tax rate from org)
- Net recommended settlement (auto-calculated)

All calculated fields update reactively as inputs change. "Save" writes to the case financial summary.

### 2.26 ContentsInventorySection

**File:** `web-app/src/components/case/sections/ContentsInventorySection.tsx`  
**Verticals:** property_assessor, loss_adjuster

Full contents inventory table (more detailed version of ContentsListDropSection):
- Table view with columns: Item, Category (furniture/electronics/appliances/clothing/jewellery/tools/other), Qty, Purchase price, Age, Depreciation %, Assessed value
- Add row button at bottom
- Inline editing: click any cell to edit
- Running totals row
- Import from uploaded document (link to ContentsListDropSection)
- Export to CSV button

### 2.27 QuantumReconciliationSection

**File:** `web-app/src/components/case/sections/QuantumReconciliationSection.tsx`  
**Verticals:** loss_adjuster

The core loss adjuster financial reconciliation:
- Claimed amount (from claim)
- Assessed amounts by category (each line editable): Motor repair, Motor write-off, Building reinstatement, Contents replacement, Stock, Business interruption
- Rejected amounts with reason field per line
- Adjustments (betterment, excess, average, depreciation)
- Net quantum (auto-calculated)
- Recommended settlement
- Notes field

### 2.28 FindingsListSection

**File:** `web-app/src/components/case/sections/FindingsListSection.tsx`  
**Verticals:** investigator

This is the core investigator working tool. Implement fully:

**Finding entry form:**
- Finding number (auto-incremented: F001, F002, etc.)
- Finding statement (the actual finding — plain text, multi-line)
- Category: Fraud indicator / Policy breach / Inconsistency / Corroboration / Exculpatory / Other
- Severity: High / Medium / Low
- Supporting evidence: evidence picker (link one or more evidence items from the case)
- Source: interview / document / observation / records check / other
- Status: Confirmed / Unconfirmed / Disputed

**Findings list view:**
- Each finding as a card: number badge, statement, category chip, severity badge, evidence count, status
- Expand card: show all details + linked evidence thumbnails
- Edit inline, delete with confirmation
- Reorder by drag handle (or up/down arrows)

**Summary statistics** at top: Total findings, by severity (High: X, Medium: X, Low: X), by category

**Save** each finding to `investigation_findings` table (create via `POST /api/cases/[caseId]/findings` — implement this route if it doesn't exist, inserting into the `investigation_findings` table from the schema).

### 2.29 InvestigationTimelineSection

**File:** `web-app/src/components/case/sections/InvestigationTimelineSection.tsx`  
**Verticals:** investigator

A manually-curated chronological log of the investigation (different from the automated TimelineSection which logs system events).

**Timeline entry form:**
- Date and time
- Activity type: Site visit / Interview / Document review / Records check / Surveillance / Phone call / Email / Report writing / Other
- Description (free text)
- Outcome / result
- Person(s) involved (free text)
- Duration (hours, for time tracking)

**Timeline view:**
- Vertical timeline with date markers
- Each entry: activity icon, date/time, activity type chip, description, outcome, duration badge
- Edit / delete each entry
- "Export timeline" button: generates a formatted plain-text or markdown summary

**Save** to `investigation_timeline_entries` jsonb field or a dedicated table.

### 2.30 PartiesStatementsSection

**File:** `web-app/src/components/case/sections/PartiesStatementsSection.tsx`  
**Verticals:** investigator, loss_adjuster

For each party (from `case_contacts`), show:
- Party name and role
- Interview status: Not interviewed / Interview requested / Interview conducted / Declined to interview / Not available
- Statement status: Not obtained / Statement drafted / Sworn statement obtained / Refused
- Interview notes (free text, per party)
- "Upload statement" button: links to StatementUploadSection for that party's document
- Date of interview, interviewer name

Add a party-specific notes field that saves against the contact record.

### 2.31 RedFlagsSection

**File:** `web-app/src/components/case/sections/RedFlagsSection.tsx`  
**Verticals:** investigator, loss_adjuster

**Red flag entry:**
- Category: Staged loss / Inflated claim / Identity fraud / Policy fraud / Previously rejected / Unusual behaviour / Inconsistent account / SIU history / Other
- Description (the specific red flag observed)
- Severity: High / Medium / Low
- Supporting finding(s): link to finding entries from FindingsListSection
- Supporting evidence: link to evidence items

**Red flags list:**
- Cards sorted by severity (High first)
- Colour-coded: red border for High, amber for Medium, blue for Low
- Count badges: "3 High, 2 Medium, 1 Low"
- Each card: category icon, description, severity badge, linked findings count, linked evidence count

**Save** to `red_flags` jsonb field or a dedicated table (create API route as needed).

### 2.32 TimeDisbursementsSection

**File:** `web-app/src/components/case/sections/TimeDisbursementsSection.tsx`  
**Verticals:** investigator

The timesheet and disbursements log — this is how investigators generate their fee note.

**Time entries:**
- Date
- Activity description
- Activity type: Instruction / File review / Site visit / Interview / Surveillance / Report writing / Admin / Travel / Other
- Hours (decimal: e.g., 1.5)
- Rate (pulled from client rate structure if available, otherwise uses org default rate from `org_settings`)
- Amount (auto-calculated: hours × rate)

**Disbursements:**
- Date
- Description
- Category: Travel / Accommodation / Copies / Searches / External services / Other
- Amount (currency input)
- Taxable: yes/no

**Summary section:**
- Total professional fees (sum of time × rate)
- Total disbursements
- Subtotal
- VAT (calculated from org settings)
- Total invoice amount

**"Generate Fee Note" button**: navigates to or opens the invoice builder pre-populated with these time and disbursement entries.

Save all entries to the `time_entries` table from the schema.

### 2.33 ReportBuilderSection

**File:** `web-app/src/components/case/sections/ReportBuilderSection.tsx`  
**Verticals:** All

**This section should render the existing `ReportBuilder` component** (`web-app/src/components/report/ReportBuilder.tsx`), which is fully implemented but not yet wired.

Bridge implementation:
1. Fetch case data via `useCase(caseId)`
2. Fetch org settings (for branding) via `useOrgSettings()` or equivalent
3. Fetch existing report for this case via `useReportsForCase(caseId)` (create hook if needed: `GET /api/cases/[caseId]/reports`)
4. If no report: create one automatically (`POST /api/cases/[caseId]/reports`) with status `draft` and the correct vertical config
5. Fetch existing sections for the report: `GET /api/reports/[reportId]/sections`
6. Render `<ReportBuilder caseData={caseData} reportId={reportId} orgBranding={orgBranding} initialSections={sections} onSave={handleSave} />`
7. `onSave`: `POST /api/reports/[reportId]/sections` to upsert sections in bulk

### 2.34 ReportPreviewSection

**File:** `web-app/src/components/case/sections/ReportPreviewSection.tsx`  
**Verticals:** All

Render the existing `<ReportPreview />` component within the section, passing the current report sections and org branding. The preview shows an A4-style render of how the final report will look.

Add a "Generate PDF" button that calls `POST /api/reports/[reportId]/generate-pdf`. Show loading state. On success, provide a download link (signed URL from Supabase Storage).

### 2.35 OutcomeFinancialsSection

**File:** `web-app/src/components/case/sections/OutcomeFinancialsSection.tsx`  
**Verticals:** All

Bridge to the existing `<OutcomeFinancialsTab assessment={fullAssessment} onNavigate={() => {}} />` for motor cases.

For non-motor verticals (property, investigator), render a vertical-appropriate financial summary:
- **Property:** Reinstatement values summary (from ReinstatementValuesSection data)
- **Investigator:** Fee note summary (from TimeDisbursementsSection data)
- **Loss adjuster:** Quantum reconciliation summary

Include outcome selector: dropdown/button group showing `defaultOutcomes` from the vertical config. Saving the selected outcome updates the case or assessment record.

### 2.36 PackBuilderSection

**File:** `web-app/src/components/case/sections/PackBuilderSection.tsx`  
**Verticals:** All

Bridge to the existing report pack page logic (see `web-app/src/app/app/cases/[id]/report/page.tsx`). The pack builder should:
- List all items available to include in the pack: Assessment report (PDF), Photo evidence PDF, Signed invoices, Supporting documents
- Checkbox for each to include/exclude
- "Generate Pack" button: calls `POST /api/cases/[caseId]/export` (create route if needed). Gate through billing credit check. Show loading state
- On success: download link + "Email pack" button
- Show previous pack generations with timestamps and download links

### 2.37 InvoiceBuilderSection

**File:** `web-app/src/components/case/sections/InvoiceBuilderSection.tsx`  
**Verticals:** All

Full invoice creation within the case:
- Client/bill-to: pre-populated from client on case. Editable
- Invoice number: auto-generated (sequential per org)
- Invoice date: today (editable)
- Due date: today + 30 days (editable)
- Line items table:
  - Description
  - Quantity
  - Unit price (currency input)
  - Amount (auto-calculated)
  - Add/remove rows
- If investigator: "Import from Time & Disbursements" button that populates line items from the TimeDisbursementsSection
- Subtotal, VAT (from org settings), Total
- Notes field
- "Save Invoice" button: `POST /api/invoices` or uses existing invoice hooks
- "Download Invoice PDF" button
- "Send Invoice" button (requires Resend to be configured)

---

## SECTION 3 — INVESTIGATOR VERTICAL (BLOCKING)

The investigator vertical has its sections defined in `VERTICAL_CONFIGS` but several key capabilities need additional support beyond the section implementations above.

### 3.1 Investigation-Specific Case Creation

When creating a new case and the user's vertical is `investigator` (or they select investigator during case creation), the `CreateCaseModal` should show additional fields:
- Referral source (select: Insurer / SIU / Attorney / Broker / Corporate / Other)
- Nature of referral (free text)
- Specific mandate questions (multi-line text)
- Subject(s) — add one or more subjects at case creation (name, ID type/number, relationship)
- Confidentiality level

The CreateCaseModal already exists — extend it conditionally based on vertical selection.

### 3.2 Investigation Report Structure

The investigator vertical's report uses a specific structure (from the vertical config `reportSections`). Ensure the `ReportBuilder` component, when given `vertical: 'investigator'`, shows the correct sections:
- Cover Page (not AI-draftable — just metadata rendered automatically)
- Mandate & Instruction
- Methodology
- Parties Involved
- Findings
- Evidence Annexure (auto-generated from linked evidence — list of all evidence items with descriptions and references)
- Red Flag Summary
- Outcome & Recommendation
- Investigator Declaration

The Evidence Annexure section should auto-populate from the `evidence` table — the AI draft button is not shown for this section. Instead it generates the list automatically.

### 3.3 Investigator Dashboard Widgets

On the main web dashboard (`/app/dashboard`), add investigator-specific widgets when the org's vertical is `investigator`:
- "Open investigations" with age: how many days since assignment
- "Overdue mandates" (cases where mandate requirements are not met and case is older than 14 days)
- "Fee notes outstanding" (invoices where status is draft or sent but not paid)

---

## SECTION 4 — REPORT DELIVERY (BLOCKING)

The report is built. The PDF is generated. But it goes nowhere. This section wires delivery.

### 4.1 Resend Email Integration

Create `web-app/src/lib/adapters/email/resend-client.ts` (the adapter already exists conceptually — ensure it's wired):

The `RESEND_API_KEY` and `RESEND_FROM_EMAIL` environment variables gate real sending vs dry-run.

Create API route: `POST /api/cases/[caseId]/deliver-report`

Request body:
```json
{
  "reportPackId": "uuid",
  "recipientEmail": "string",
  "recipientName": "string",
  "customMessage": "string (optional)",
  "includeInvoice": "boolean"
}
```

This route must:
1. Fetch the report pack and its storage path from Supabase Storage
2. Generate a signed URL (valid for 7 days) for download
3. Resolve the appropriate email template from `comms_templates` (or use default from `EMAIL_TEMPLATES`) for event `report_submitted`
4. Replace placeholders: `{{client_name}}`, `{{case_number}}`, `{{assessor_name}}`, `{{report_link}}`, `{{insurer_name}}`
5. Send via Resend API (`resend.emails.send()`) — or log to `comms_log` with `delivery_status: 'dry_run'` if Resend is not configured
6. Write to `comms_log` table regardless of send status
7. Return `{ success: boolean, messageId?: string, dryRun: boolean }`

### 4.2 Report Delivery UI

In the PackBuilderSection (and on the report pack page `/app/cases/[id]/report`), add an "Email Report" button that opens a delivery sheet/modal:
- To: (pre-populated with insurer/broker email from case contacts, editable)
- Subject: (pre-populated from template, editable)
- Body: (pre-populated from template with placeholders resolved, editable)
- "Include invoice" checkbox
- "Send" button — calls the delivery API route above
- "Copy link" alternative — shows the signed URL for manual sharing

If Resend is not configured, show a warning: "Email sending is not configured — copy the link below to share manually" and show the signed download URL.

---

## SECTION 5 — SIGNATURE CAPTURE

Assessors sign their reports. Investigators sign their declarations. This is a gap in the current system.

### 5.1 Signature Pad Component

Create `web-app/src/components/SignaturePad.tsx`:

- Use `react-signature-canvas` (`npm install react-signature-canvas @types/react-signature-canvas`) or implement a simple HTML5 Canvas signature pad from scratch (canvas element + mouse/touch event listeners — preferred, no dependency)
- Props: `onSave: (dataUrl: string) => void`, `onClear: () => void`, `width?: number`, `height?: number`, `label?: string`
- Canvas area: white background, thin border, instructions "Sign here" in light grey
- Buttons below: "Clear" and "Save Signature"
- On save: call `canvas.toDataURL('image/png')` and pass to `onSave`
- Mobile-friendly: touch events must work on iOS Safari

### 5.2 Signature Integration Points

**Assessment report signature** (`AssessmentReport.tsx` and `ReportBuilderSection`):
- At the bottom of the report, before the declaration section, add a "Assessor Signature" block
- Show the saved signature image if one exists (stored as base64 in the report or as a Supabase Storage path)
- "Sign" button opens the `SignaturePad` in a modal
- On save: upload the signature image to Supabase Storage (`org_id/signatures/case_id_report_id.png`), save the path to the `reports` table (`signature_path` column — add this column if missing), display the signature inline
- Also capture: printed name (text input, pre-filled from user profile), date (auto-filled to today), qualification/designation (text input, pre-filled from org settings)

**Third-party signature** (insured signature on site):
- Add a "Capture Insured Signature" button on the field case detail (Evidence tab or mandate tab)
- Opens the `SignaturePad` full-screen on mobile
- Saves with label "Insured: [insured name]" and timestamp
- Stored in evidence as a photo of type `signature`

---

## SECTION 6 — SERVICE WIRING (PRIORITY ORDER)

Wire these in order — each unlocks real functionality.

### 6.1 Resend (Email) — Wire First

Already detailed in Section 4. The dry-run fallback means the app functions without it, but real users need email delivery.

Environment variables needed:
```
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=reports@yourdomain.com
```

### 6.2 OpenAI (AI Report Drafting)

The `SectionEditor` component already calls `POST /api/ai/draft-section`. Ensure this route exists and is implemented:

`web-app/src/app/api/ai/draft-section/route.ts`:
- Check for `OPENAI_API_KEY` env var
- If not present: return `{ content: "[AI drafting not configured — please enter this section manually]" }` (graceful stub)
- If present: compose a system prompt based on the vertical and section key, include sanitised case context (never send PII — strip names, contact details, ID numbers before sending), call OpenAI `gpt-4o-mini` (cost-effective for drafting), stream the response back
- Log usage to `platform_events`

The AI draft is never auto-accepted — it's presented alongside the existing content with "Accept draft" / "Dismiss" buttons (already implemented in `SectionEditor.tsx`).

### 6.3 Google Cloud Vision (OCR)

The OCR pipeline is implemented at `/api/intake/process`. Ensure the Google Vision adapter is correctly wired:
- Check for `GOOGLE_CLOUD_VISION_CREDENTIALS` (JSON key file path or inline JSON)
- The stub mode (`PdfParse` + `Mammoth`) must continue to work when Vision is not configured
- Document classification (which document type: valuation / repairer quote / parts quote / statement) should be inferred from filename and content before routing to the field extractor

### 6.4 Stripe (Billing)

The billing gate (`checkAndDeductPackCredit`) is implemented. Wire Stripe for real payment:
- Ensure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and price ID env vars are documented clearly in `.env.example`
- The webhook handler at `/api/webhooks/stripe` must handle: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`
- Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### 6.5 Playwright (PDF Generation)

`PLAYWRIGHT_EXECUTABLE_PATH` must point to a Chromium binary. In a serverless/Vercel deployment, use `@sparticuz/chromium` package. Add this to the PDF generation route:

```typescript
import chromium from '@sparticuz/chromium'
// Use chromium.executablePath() as the executable path
```

Document the deployment requirements clearly in `SETUP_INSTRUCTIONS.md`.

---

## SECTION 7 — MOBILE APP RETIREMENT

The native Expo app in `mobile-app/` is being retired in favour of the PWA field routes. Take the following steps:

1. **Do not delete the mobile-app directory** — keep it for reference during PWA build to ensure feature parity
2. Add `mobile-app/README.md` update noting: "This native app has been superseded by the PWA field routes at `/app/field/`. This directory is archived for reference."
3. Update `.github/workflows/ci.yml` to skip the mobile-app build step (or comment it out with a note)
4. Ensure all unique logic from the mobile app is captured in the PWA before considering this done. Cross-reference:
   - `mobile-app/app/(app)/(tabs)/` — each screen has a PWA equivalent
   - `mobile-app/src/lib/upload/` — replaced by `web-app/src/lib/upload/field-upload-queue.ts`
   - `mobile-app/src/lib/db/upload-queue.db.ts` — replaced by IndexedDB implementation
   - `mobile-app/src/components/` — key UI patterns (EvidenceCaptureModal, MandateSelectionModal, etc.) should be referenced when building PWA equivalents

---

## SECTION 8 — SERVICE WORKER OFFLINE CACHE (DATA)

Beyond the static asset caching in Section 1.1, implement data-level offline support for the field app.

### 8.1 Case Data Cache

When a user visits `/app/field/cases/[id]`, cache the response from:
- `GET /api/cases/[id]` — case details
- `GET /api/cases/[id]/evidence` — evidence list (metadata only, not signed URLs)
- `GET /api/cases/[id]/mandates` — mandate and requirement checks
- `GET /api/cases/[id]/notes` — case notes

Cache these in a dedicated IndexedDB store (`refrag-offline-cache`):
- Key: the API URL
- Value: `{ data: any, cachedAt: ISO string }`
- TTL: 24 hours

The field case detail page should check this cache when the network request fails, display cached data, and show a "Showing cached data from [time]" banner.

When back online, invalidate the cache for any cases that were updated during offline period (using the React Query `invalidateQueries` mechanism).

### 8.2 Evidence Upload Queue Persistence

Already covered in Section 1.9 with IndexedDB. Ensure that:
- Queued items survive page refresh (IndexedDB is persistent)
- Blob URLs that are no longer valid (page was refreshed) are detected and marked as failed with a clear message
- The upload queue status is shown on the main field layout (not just the capture screen) — small badge on the Capture tab icon showing pending count

---

## SECTION 9 — UI ENHANCEMENTS

These are not blocking but should be done before public launch.

### 9.1 "Add to Home Screen" Nudge

Covered in Section 1.11. Implement properly.

### 9.2 Loading Skeleton States

Every data-fetching component that currently shows a spinner should instead show a skeleton:
- Case list: skeleton cards (grey blocks matching card dimensions)
- Case detail: skeleton for each section (grey block matching heading + content area)
- Evidence grid: skeleton grid of grey squares
- Dashboard: skeleton stats + skeleton list items

Use CSS animation (`animate-pulse` Tailwind class) on grey `div` placeholders. No library needed.

### 9.3 Error States

Every section that fetches data should handle the error state explicitly:
- Show: an error icon, a brief message ("Could not load evidence — check your connection"), and a "Retry" button that calls `refetch()`
- Do not show a blank white box on error

### 9.4 Empty States

Every section that can have no data should have a purposeful empty state:
- Appropriate icon (from lucide-react — already in the project)
- Helpful message ("No evidence captured yet")
- Action button where applicable ("Upload first photo")

### 9.5 Toast Notifications

The `useToast` hook exists in the project. Ensure it is used consistently for:
- Successful saves ("Note saved")
- Successful uploads ("3 photos uploaded")
- Errors ("Failed to save — please try again")
- Status changes ("Case status updated to Site Visit")

Do not use browser `alert()` anywhere.

### 9.6 Keyboard Navigation and Accessibility

All interactive elements must be keyboard-accessible. Specifically:
- Form inputs have associated `<label>` elements
- Buttons have accessible names (not just icons — include `aria-label` on icon-only buttons)
- Modals trap focus and return focus to the trigger on close
- Status updates are announced via `aria-live` regions

---

## SECTION 10 — DATA INTEGRITY AND SECURITY

These must be addressed before real user data is stored.

### 10.1 RLS Policy Testing

The RLS policies in `database/rebuild/002_rls_policies.sql` are implemented but untested. Write a test suite (`web-app/src/__tests__/rls/`) that verifies:
- A user from Org A cannot read cases belonging to Org B
- A member cannot delete evidence uploaded by another member (only org admin can)
- An unauthenticated request to any case API returns 401/403
- The `is_org_member()`, `is_org_admin()`, `is_staff()` helper functions return correct results

Use the Supabase test client (create a dedicated test Supabase project or use `supabase local` for CI).

### 10.2 Input Validation

Every API route must validate its input with Zod before processing. Audit all routes in `web-app/src/app/api/` and ensure:
- Request body is parsed with a Zod schema
- Validation errors return `400` with a structured error response: `{ error: "Validation failed", details: z.ZodError.issues }`
- UUID parameters are validated as UUIDs (not just passed raw to Supabase — this prevents injection if RLS ever has a gap)

### 10.3 Signed URL Security

Evidence signed URLs from Supabase Storage should:
- Have a maximum validity of 1 hour (not longer) for in-app viewing
- Have a validity of 7 days for report delivery links sent via email
- Never be stored in the database — always generated fresh when needed
- Be generated server-side only (never expose the service role key to the client)

Review all calls to `supabase.storage.from().createSignedUrl()` and ensure they use the server-side Supabase client (service role key) via API routes, not the anon client.

---

## SECTION 11 — DEPLOYMENT READINESS

### 11.1 Environment Variables Documentation

Update `web-app/.env.example` to include every required and optional environment variable with a comment explaining what it does and where to obtain it:

```bash
# REQUIRED — Supabase project connection
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx   # Server-side only — never expose to client

# REQUIRED — App URL (used for email links and redirects)
NEXT_PUBLIC_APP_URL=https://app.refrag.com

# OPTIONAL — OCR (stub mode active without this)
GOOGLE_CLOUD_VISION_CREDENTIALS={"type":"service_account",...}   # Inline JSON string

# OPTIONAL — AI report drafting (stub mode active without this)
OPENAI_API_KEY=sk-xxxx

# OPTIONAL — Email delivery (dry-run mode active without this)
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=reports@yourdomain.com

# OPTIONAL — PDF generation (PDFKit fallback active without this)
# For Vercel: use @sparticuz/chromium — no PLAYWRIGHT_EXECUTABLE_PATH needed
PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium

# OPTIONAL — Stripe billing (stub mode active without this)
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
STRIPE_PRICE_ID_CREDITS_5=price_xxxx
STRIPE_PRICE_ID_CREDITS_20=price_xxxx
STRIPE_PRICE_ID_CREDITS_50=price_xxxx
STRIPE_PRICE_ID_CREDITS_100=price_xxxx

# OPTIONAL — Google Maps (plain text inputs if not set)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaxxxx
```

### 11.2 Vercel Deployment Configuration

Create `vercel.json` in the web-app root:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "regions": ["fra1"],
  "functions": {
    "src/app/api/reports/*/generate-pdf/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/intake/process/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/cases/*/export/route.ts": {
      "maxDuration": 60
    }
  }
}
```

PDF generation and OCR require longer timeout than Vercel's default 10s.

### 11.3 Database Migration Strategy

Document in `SETUP_SUPABASE.md` the order in which SQL files must be run:
1. `database/rebuild/001_master_schema.sql`
2. `database/rebuild/002_rls_policies.sql`
3. Any additional migration files in order

Add a note about how to apply to a production Supabase project (via the Supabase dashboard SQL editor or `supabase db push` with Supabase CLI).

---

## SECTION 12 — TESTING

### 12.1 Critical Path Tests

Add tests for the following (use Vitest, already configured):

**Upload queue:**
- `enqueue()` persists items to IndexedDB
- `getByStatus('pending')` returns only pending items
- Processor respects max concurrency of 3
- Failed item is retried with exponential backoff
- Item is not retried more than 4 times

**Billing gate:**
- `checkAndDeductPackCredit()` returns false if credits are 0
- Credit deduction is atomic (no double-spend)
- Subscription mode increments monthly counter, not credits

**Report builder:**
- `ReportBuilder` renders all sections for each vertical
- AI draft button is not shown for sections where `aiDraftAvailable: false`
- Save calls the correct API endpoint

**RLS (Supabase test client):**
- Cross-org data isolation
- Unauthenticated access rejection

### 12.2 End-to-End Test Scenarios

Document (in `TESTING_FLOWS.md`) the critical user journeys that must be manually verified before launch:

1. **Motor assessor full flow**: Create case → Upload evidence → Complete assessment (instruction, vehicle, tyres, damages, parts, values) → Generate report → Generate PDF → Email report → Generate pack → Download ZIP
2. **Investigator full flow**: Create case → Add referral details → Add parties → Capture evidence → Add findings → Add red flags → Log time → Build report → Generate fee note
3. **PWA field flow**: Open on mobile Chrome → Add to home screen → Open from home screen → View assigned case → Capture 5 photos (with GPS) → Mark mandate requirement as provided → Add a note → Go offline → Verify cached data loads → Come back online → Verify photos uploaded
4. **Multi-tenant isolation**: Log in as User A (Org 1) → note a case ID → log in as User B (Org 2) → attempt to access Org 1's case via direct URL → verify 404 or redirect

---

## CODING STANDARDS — APPLY THROUGHOUT

These are non-negotiable standards for all new code written in this project.

**TypeScript:** No `any` types unless there is a documented reason. All function parameters and return types must be explicitly typed.

**API routes:** All API routes must: (1) verify Supabase session (`supabase.auth.getUser()`), (2) validate input with Zod, (3) use the server-side Supabase client (service role key) only for admin operations, (4) return consistent error shapes.

**React components:** No class components. All components are functional with hooks. No `useEffect` for data fetching — use React Query (already configured). `useEffect` is only for DOM side effects and event listener cleanup.

**Data fetching:** All Supabase queries go through the hook layer (`web-app/src/hooks/`) not directly from components. New hooks follow the existing pattern (React Query `useQuery`/`useMutation`, naming convention `useNoun`, `useCreateNoun`, `useUpdateNoun`, `useDeleteNoun`).

**Formatting utilities:** Use `formatCurrency(amount, currency)`, `formatDate(date)`, `formatDateTime(date)`, `formatTime(date)` from `web-app/src/lib/utils/formatting.ts`. Never hardcode currency symbols or locale strings.

**Vertical config:** Never add `if (vertical === 'motor_assessor')` branching in components. Use `VERTICAL_CONFIGS[vertical]` and config-driven rendering.

**No hardcoded strings:** Country names, regulatory references, and business-specific terminology must come from the vertical config or org settings. The codebase is internationally deployable.

**Adapters:** All external service calls go through the adapter pattern (`web-app/src/lib/adapters/`). Never call an external API directly from a component or API route — always through the adapter interface, which provides the stub fallback.

**Accessibility:** Every new interactive element follows the rules in Section 9.6.

**Comments:** Write comments for "why", not "what". Do not add comments that simply restate the code.

---

## BUILD SEQUENCE SUMMARY

Follow this order strictly:

1. **Section 1** — PWA infrastructure + field routes (the thing that replaces TestFlight)
2. **Section 2** — All 30 case workspace sections (makes the product actually usable)
3. **Section 3** — Investigator vertical completions
4. **Section 4** — Report delivery (Resend wiring)
5. **Section 5** — Signature capture
6. **Section 6** — Service wiring (OpenAI, Vision, Stripe, Playwright)
7. **Section 7** — Mobile app retirement (documentation + CI)
8. **Section 8** — Offline data cache
9. **Section 9** — UI enhancements
10. **Section 10** — Security audit
11. **Section 11** — Deployment configuration
12. **Section 12** — Testing

Sections 1–5 are the MVP. Sections 6–12 are required for production launch but can run in parallel with testing after Sections 1–5 are complete.

---

*End of prompt. Read the codebase. Then build.*
