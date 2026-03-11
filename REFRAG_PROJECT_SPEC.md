# Refrag - Professional Workflow OS for Assessors/Inspectors

## Project Overview

**Refrag** is a professional workflow OS for assessors/inspectors. It is **NOT** an insurer core system. It must produce an insurer-approved "Assessor Pack" output (PDF bundle) while allowing assessors to use their own workflow inside Refrag.

### Application Type
- Web app (PWA)
- Multi-tenant by organisation (an assessor firm)
- Users belong to organisations

### Tech Stack

**Backend:**
- Supabase Postgres DB
- Supabase Auth
- Supabase Storage for media
- Row Level Security (RLS) everywhere

**Frontend:**
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui (or equivalent)
- Supabase JS client
- Zod for validation

**Core Requirements:**
- Type-safe API layer
- Clean, minimal, professional UI

---

## Core Goals

1. **Case lifecycle management** (create case, status progression)
2. **Evidence capture + tagging** (images/videos) tied to cases
3. **Mandates / requirements checklist** per insurer/client rule-set (configurable fields)
4. **Report builder** (structured sections, notes, versioning)
5. **Generate "Assessor Pack"** (single PDF + attachments list, export)
6. **Communications log + triggers** (email integration later; for now store templates + logs)
7. **Audit trail** of key actions

---

## Database Schema Design

### Common Fields
Every table must have:
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `created_by` (uuid) - references auth.users.id
- `org_id` (uuid) - references organisations.id
- Soft-delete if needed

### Entity Definitions

#### 1. organisations
- `id` (uuid pk)
- `name` (text)
- `slug` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### 2. org_members
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `user_id` (uuid fk → auth.users.id)
- `role` (enum: owner, admin, member)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique constraint:** (org_id, user_id)

#### 3. cases
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `created_by` (uuid → auth.users.id)
- `case_number` (text - unique per org)
- `client_name` (text) - insured/broker/insurer reference label
- `insurer_name` (text nullable)
- `broker_name` (text nullable)
- `claim_reference` (text nullable)
- `loss_date` (date nullable)
- `location` (text nullable)
- `status` (enum: draft, assigned, site_visit, awaiting_quote, reporting, submitted, additional, closed)
- `priority` (enum: low, normal, high)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### 4. case_contacts
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `case_id` (uuid fk → cases.id)
- `type` (enum: insured, broker, insurer, panelbeater, other)
- `name` (text)
- `email` (text)
- `phone` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### 5. mandates
*("mandate" = insurer/client requirements set)*
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `name` (text)
- `insurer_name` (text nullable)
- `description` (text nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### 6. mandate_requirements
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `mandate_id` (uuid fk → mandates.id)
- `key` (text) - e.g. "VIN_PHOTO", "ODOMETER_PHOTO"
- `label` (text)
- `description` (text)
- `required` (boolean)
- `evidence_type` (enum: photo, video, document, text_note, none)
- `order_index` (int)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### 7. case_mandates
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `case_id` (uuid fk → cases.id)
- `mandate_id` (uuid fk → mandates.id)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### 8. evidence
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `case_id` (uuid fk → cases.id)
- `uploaded_by` (uuid → auth.users.id)
- `storage_path` (text) - Supabase storage path
- `media_type` (enum: photo, video, document)
- `content_type` (text)
- `file_name` (text)
- `file_size` (int)
- `captured_at` (timestamptz nullable)
- `notes` (text nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### 9. evidence_tags
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `case_id` (uuid fk → cases.id)
- `evidence_id` (uuid fk → evidence.id)
- `tag` (text) - e.g. "VIN", "DAMAGE_FRONT_LEFT", "UNDERCARRIAGE"
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### 10. requirement_checks
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `case_id` (uuid fk → cases.id)
- `mandate_requirement_id` (uuid fk → mandate_requirements.id)
- `status` (enum: missing, provided, not_applicable)
- `evidence_id` (uuid fk → evidence.id nullable)
- `note` (text nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique constraint:** (case_id, mandate_requirement_id)

#### 11. reports
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `case_id` (uuid fk → cases.id)
- `created_by` (uuid → auth.users.id)
- `version` (int)
- `status` (enum: draft, ready, submitted)
- `title` (text)
- `summary` (text nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique constraint:** (case_id, version)

#### 12. report_sections
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `report_id` (uuid fk → reports.id)
- `section_key` (text) - e.g. "FINDINGS", "DAMAGE", "ESTIMATE", "RECOMMENDATION"
- `heading` (text)
- `body_md` (text) - markdown
- `order_index` (int)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### 13. exports
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `case_id` (uuid fk → cases.id)
- `report_id` (uuid fk → reports.id nullable)
- `export_type` (enum: assessor_pack)
- `storage_path` (text nullable) - where generated pdf stored
- `meta` (jsonb) - list of included evidence ids
- `created_by` (uuid → auth.users.id)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### 14. comms_templates
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `name` (text)
- `subject_template` (text)
- `body_template_md` (text) - markdown
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### 15. comms_log
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `case_id` (uuid fk → cases.id)
- `sent_by` (uuid → auth.users.id)
- `channel` (enum: email, note)
- `to_recipients` (text)
- `subject` (text)
- `body_md` (text) - markdown
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### 16. audit_log
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `actor_user_id` (uuid → auth.users.id)
- `case_id` (uuid fk → cases.id nullable)
- `action` (text) - e.g. "CASE_CREATED", "EVIDENCE_UPLOADED", "REPORT_SUBMITTED"
- `details` (jsonb)
- `created_at` (timestamptz)

#### 17. case_notes
- `id` (uuid pk)
- `org_id` (uuid fk → organisations.id)
- `case_id` (uuid fk → cases.id)
- `created_by` (uuid → auth.users.id)
- `body_md` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Database Deliverables Required

**A) SQL create table statements**
**B) enum types**
**C) indexes**
**D) constraints**
**E) a brief ERD description**

*Note: RLS policies will be implemented in next step*

---

## Row Level Security (RLS) Policies

### Rules

- A logged-in user can only access rows where `org_id` is one of the orgs they belong to in `org_members`.
- **Owners/admins** can do everything in their org.
- **Members** can do everything too for MVP EXCEPT: can't delete organisations or remove owners.
- All inserts must set `org_id` to a permitted `org_id` and `created_by`/`actor` fields to `auth.uid()`.

### Implementation Requirements

- Enable RLS on every table
- Create helper SQL functions if needed:
  - `is_org_member(org_id)`
  - `is_org_admin(org_id)`
- Policies for SELECT/INSERT/UPDATE/DELETE for each table
- Special care:
  - **organisations:** only members can select their org; only owners/admin create/update
  - **org_members:** members can select; only owners/admin manage membership
  - **audit_log:** insert only; select within org; no update/delete

**Deliverable:** SQL policies ready to paste into Supabase

---

## Next.js Application Scaffolding

### Project Setup

**Tech Stack:**
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase client setup for server + client (createServerClient/createBrowserClient)

### Authentication Flow

- `/login` (email+password; add magic link optional)
- `/logout`
- Middleware to protect `/app` routes
- After login, route to `/app`

### Application Layout

**Protected Routes:** `/app` (protected)

**Routes:**
- `/app` - Main app entry
- `/app/dashboard` - List cases
- `/app/cases/[id]` - Case detail
- `/app/cases/[id]/evidence` - Evidence management
- `/app/cases/[id]/mandate` - Mandate checklist
- `/app/cases/[id]/report` - Report builder
- `/app/cases/[id]/export` - Export/Assessor Pack generation
- `/app/settings` - Org + templates

### Design Requirements

**Aesthetic:** Minimal, clean, insurer-trust aesthetic

**Color Palette (UI tokens only, no extra colors):**
- `#1F2933` - Primary text
- `#5B6B7A` - Neutral
- `#B4533C` - Accent CTA

**Typography:**
- **Body:** Inter
- **Headings:** Space Grotesk

### Deliverables

- File tree overview
- Key code files (auth, middleware, supabase client)
- Basic UI shell with left nav + top bar

---

## Feature Implementation Specifications

### 1. Case Management

#### A) Cases List (`/app/dashboard`)

**Functionality:**
- Fetch cases for current org
- Search by case_number / client_name / claim_reference
- "New Case" button opens modal with fields:
  - `case_number` (auto generate: ORGSLUG-YYYY-0001 style)
  - `client_name`
  - `insurer_name` (optional)
  - `claim_reference` (optional)
  - `loss_date` (optional)
  - `location` (optional)
  - `status` defaults to draft
- Create case and redirect to `/app/cases/[id]`

#### B) Case Detail (`/app/cases/[id]`)

**Layout:**
- Header: case_number + status dropdown + quick actions
- Tabs: Overview, Evidence, Mandate, Report, Export, Comms
- Overview shows key fields and edit form

#### C) Permissions

- Only org members can access
- All writes validated with Zod

**Deliverables:**
- Supabase queries (server actions or route handlers)
- Components
- Types
- Error handling and loading states

---

### 2. Evidence Management

**Route:** `/app/cases/[id]/evidence`

**Features:**

**Upload:**
- Upload area (drag & drop)
- Accept images, videos, PDFs
- Store in Supabase Storage bucket: "evidence"
- Storage path: `org/{org_id}/case/{case_id}/{uuid}-{filename}`
- On upload success create evidence row

**Display:**
- Show grid/list with:
  - thumbnail
  - file type
  - captured_at (optional)
  - notes
  - tags

**Tagging:**
- Allow add/remove tags (free text + suggested tags)
- Suggested tags list:
  - VIN, ODOMETER, FRONT, REAR, LEFT, RIGHT, UNDERCARRIAGE, ENGINE, INTERIOR, CHASSIS, DAMAGE_CLOSEUP, DAMAGE_WIDE
- Save in evidence_tags table
- Clicking a tag filters evidence list

**Additional:**
- Signed URL retrieval for viewing
- Delete evidence (soft delete or hard delete) with confirmation
- Audit log entries for uploads/deletes

---

### 3. Mandates and Requirement Checklist

#### A) Settings: `/app/settings/mandates`

**Functionality:**
- CRUD mandates
- CRUD mandate_requirements (ordered list)
- Requirement has: label, required, evidence_type, description

#### B) Case Mandate Tab: `/app/cases/[id]/mandate`

**Functionality:**
- Select a mandate for this case (case_mandates)
- When mandate selected:
  - auto-create requirement_checks rows for each mandate_requirement if not exists
- UI shows checklist:
  - label, required badge
  - status: missing/provided/not_applicable
  - if evidence_type is photo/video/document → link evidence item when provided
  - quick action: "Attach evidence" opens picker of evidence for this case filtered by media_type
- Show completeness summary: X of Y required completed

**Audit:**
- Audit events for mandate assigned, requirement provided, marked N/A

---

### 4. Report Builder

**Route:** `/app/cases/[id]/report`

**Features:**

**Versioning:**
- View latest report version (or create first version)
- "New Version" button duplicates latest report_sections into a new report with version+1

**Report Structure:**
- title
- summary (short)
- sections (ordered)

**Sections:**
- Editable in markdown editor (simple textarea ok for MVP)
- Standard default sections created on first report:
  1. Overview
  2. Findings
  3. Damage Description
  4. Estimate / Costs (placeholder fields later)
  5. Recommendation
- Allow re-order sections

**Status Workflow:**
- draft → ready → submitted
- "Mark Ready" only if required mandate items complete OR user confirms override with reason
- Save override reason to audit_log

**Audit:**
- Audit events for report created, versioned, marked ready, submitted

---

### 5. Communications

#### A) Settings: `/app/settings/templates`

**Functionality:**
- CRUD comms_templates:
  - name
  - subject_template
  - body_template_md
- Support placeholders:
  - `{{CaseNumber}}`, `{{ClientName}}`, `{{InsurerName}}`, `{{BrokerName}}`, `{{ClaimReference}}`, `{{LossDate}}`, `{{Status}}`

#### B) Case View: `/app/cases/[id]/comms`

**Functionality:**
- "New message" uses template selector
- Renders preview with placeholders filled
- User can edit before saving
- Save to comms_log with channel=email and to_recipients as free text for now
- No actual email sending in MVP

**Audit:**
- Add audit events for comms saved

---

## Section 2: Mobile App (Field Capture) - Build First

### Overview

We are building the **Refrag mobile app first** (field capture). This is a professional tool for assessors. The app must be minimal, fast, and reliable. **Offline-first is required.**

### Tech Stack

**Core:**
- Expo React Native + TypeScript
- Supabase Auth + Postgres + Storage
- React Query (TanStack Query) for data fetching
- Zod for validation
- Zustand (or Redux Toolkit) for local state if needed
- Offline caching via MMKV or SQLite, plus an upload queue

**Navigation:**
- expo-router OR React Navigation (recommend expo-router for simplicity)

**Styling:**
- Tailwind for RN optional (nativewind) OR use StyleSheet with a theme file. Keep it clean.

### Core Flows

1. **Auth** (login/logout)
2. **Select organisation** (if user belongs to multiple)
3. **Case list + create case**
4. **Case detail** (overview + mandate checklist + evidence)
5. **Evidence capture** (camera + gallery upload) with tagging and notes
6. **Requirement prompts** ("missing VIN photo", etc.) driven by mandate requirements
7. **Background upload queue** with retry
8. **Minimal report notes** (not full report builder yet): case notes and evidence notes

### UI Rules

- Clean, professional, no clutter
- Use only these colours:
  - `#1F2933` (dark)
  - `#5B6B7A` (cool neutral)
  - `#B4533C` (accent CTA)
- Use Inter for body; Space Grotesk for headings (or closest RN equivalents)
- Dark mode optional later. Start with light mode.

---

## Mobile App Architecture

### Folder Structure

```
app/                    # Routes (expo-router)
src/
  lib/                  # Core utilities
    - supabase/         # Supabase client (mobile)
    - theme/            # Theme tokens
    - utils/            # Helper functions
  components/           # Shared UI components
  features/             # Feature modules
    - cases/
    - evidence/
    - mandates/
  store/                # State management
    - offline-queue/    # Upload queue
    - auth/             # Auth state
    - org/              # Selected org state
  db/                   # Local persistence (SQLite/MMKV)
```

### Theme Tokens

**Colors:**
- `charcoal` - `#1F2933`
- `slate` - `#5B6B7A`
- `copper` - `#B4533C`
- `white` - White backgrounds only

**Typography:**
- Inter (body)
- Space Grotesk (headings)
- Sizes, weights defined in theme

### Navigation Routes

- `/(auth)/login` - Login screen
- `/(app)/org-select` - Organisation selection
- `/(app)/cases` - Cases list
- `/(app)/cases/[id]` - Case detail
- `/(app)/cases/[id]/evidence` - Evidence management
- `/(app)/cases/[id]/mandate` - Mandate checklist
- `/(app)/settings` - Settings

**Deliverables:**
- Full app architecture
- Folder structure
- Key screens list and navigation
- Code for Supabase client (mobile)
- Core components

---

## Mobile App Implementation Specifications

### 1. Project Setup

**Requirements:**
- Set up Expo RN TypeScript project
- expo-router OR React Navigation (choose one; recommend expo-router for simplicity)
- Tailwind for RN optional (nativewind) OR use StyleSheet with a theme file. Keep it clean.

**Deliverables:**

**A) Folder structure:**
- `app/` (routes)
- `src/lib` (supabase, theme, utils)
- `src/components`
- `src/features` (cases, evidence, mandates)
- `src/store` (offline queue, auth, org)
- `src/db` (local persistence)

**B) Theme tokens:**
- colors: charcoal (#1F2933), slate (#5B6B7A), copper (#B4533C), plus white backgrounds only.
- typography: Inter/Space Grotesk, sizes, weights.

**C) Navigation routes:**
- `/(auth)/login`
- `/(app)/org-select`
- `/(app)/cases`
- `/(app)/cases/[id]`
- `/(app)/cases/[id]/evidence`
- `/(app)/cases/[id]/mandate`
- `/(app)/settings`

**Deliverable:** Code + wiring

---

### 2. Supabase Auth for Mobile

**Requirements:**

- Email/password login (MVP) with optional magic link later.
- Store session securely (SecureStore).
- On login, fetch org memberships from `org_members` for `auth.uid()`.
- If multiple orgs, show org-select screen. Save selected `org_id` in secure storage.
- All app queries must scope to selected `org_id`.

**Implementation:**

- Supabase client creation (`createClient`) for RN
- Auth provider / hook
- Protect app routes: if not authenticated redirect to login; if no org selected redirect org-select.
- Error handling and loading states.
- Enforce RLS assumptions: user only sees their org rows.

**Deliverables:**
- Supabase client setup
- Auth hooks and providers
- Route protection logic
- Error handling

---

### 3. Mobile Case Management

**Screen:** `/cases`

**Features:**
- Fetch cases for selected `org_id`
- List with: case_number, client_name, status, loss_date
- Search box: filters by case_number, client_name, claim_reference
- FAB (accent copper) "New Case"

**Create Case Modal:**
- `client_name` (required)
- `insurer_name` (optional)
- `claim_reference` (optional)
- `loss_date` (optional)
- `location` (optional)
- `status` defaults to 'draft'
- `case_number` generated client-side as temporary; server will set final case_number if needed.

**Case Detail:** `/cases/[id]`
- Header: case_number + status pill
- Tabs: Overview, Mandate, Evidence
- Overview shows editable fields

**Actions:**
- Update status via dropdown
- Write audit_log entry on create/update/status change

**Deliverables:**
- All queries, hooks, and UI components
- Case list screen
- Case detail screen
- Create case modal
- Status update functionality

---

### 4. Evidence Capture

**Screen:** `/cases/[id]/evidence`

**Features:**

**Evidence List:**
- Evidence list for the case with thumbnails (image/video) + tags + notes

**Capture/Upload:**
- Add button: "Capture Photo", "Capture Video", "Upload from Gallery", "Upload Document"
- Use expo-camera / expo-image-picker / expo-document-picker
- After capture/select:
  - create local draft evidence item
  - allow user to add:
    - notes (optional)
    - tags (multi-select + free text)
    - captured_at auto set to now
  - then queue upload (offline-first)

**Storage:**
- Bucket: `evidence`
- Path: `org/{org_id}/case/{case_id}/{uuid}-{filename}`
- Upload uses signed upload or direct upload per Supabase mobile capability
- After upload success:
  - insert evidence row into DB
  - insert evidence_tags rows
  - mark queue item complete

**Additional:**
- Delete evidence (soft delete or hard delete) with confirmation
- Generate signed URLs for viewing
- Audit events for upload and delete

**Deliverables:**
- Evidence list component
- Capture/upload functionality
- Tagging interface
- Storage integration
- Signed URL handling

---

### 5. Offline-First Upload Queue

**Requirements:**

- If user is offline, allow capturing evidence and saving locally.
- Queue items stored in local DB (SQLite recommended) or MMKV with persistence.
- Each queue item includes:
  - `local_file_uri`
  - `org_id`, `case_id`
  - `media_type`, `content_type`, `file_name`
  - `tags[]`, `notes`, `captured_at`
  - `status`: pending, uploading, failed, complete
  - `retry_count`, `last_error`

**Queue Processor:**
- Runs when app opens and when connectivity returns
- Retries with exponential backoff
- Shows "Uploads" badge count on evidence screen
- Allow user to tap and retry failed items
- Allow cancel/remove pending items

**Connectivity:**
- Use expo-network or NetInfo

**Deliverables:**
- Local persistence layer
- Queue store (Zustand) + worker
- UI components for queue state
- Connectivity monitoring
- Retry logic with exponential backoff

---

### 6. Mandate Checklist for Case

**Screen:** `/cases/[id]/mandate`

**Features:**

**Mandate Selection:**
- User selects a mandate for this case (`case_mandates`)
- Once selected:
  - fetch `mandate_requirements`
  - ensure `requirement_checks` exist for each requirement (create missing rows)

**Checklist Display:**
- Display checklist grouped by `evidence_type`:
  - Required vs Optional
- Each item shows status: missing/provided/not_applicable

**Attach Evidence:**
- If requirement expects photo/video/document, user can:
  - pick from existing evidence
  - OR capture new evidence directly and auto-link it to this requirement
- When evidence linked:
  - update `requirement_checks.status = provided` and set `evidence_id`

**Prompts:**
- In Case detail, show a "Missing Requirements" card:
  - e.g. "VIN Photo missing"
  - Tapping jumps to mandate screen filtered to missing items

**Audit Events:**
- mandate assigned
- requirement marked provided
- marked N/A

**Deliverables:**
- Mandate selection UI
- Checklist component
- Evidence linking functionality
- Missing requirements prompt
- Audit logging

---

### 7. Minimal Note-Taking

#### A) Case Notes

**Table:** `case_notes`
- `id`, `org_id`, `case_id`, `created_by`, `body_md`, `created_at`

**UI:**
- `/cases/[id]` Overview: Notes section with add/edit
- Markdown not required; plain text acceptable

#### B) Comms Log Stub (No Sending)

**Functionality:**
- Allow user to record that they sent an email/whatsapp outside the app
- Create `comms_log` entry with `channel='note'` and body text like "Requested quote from X at 10:30"

**Purpose:**
- Builds auditability even before actual email automation exists.

**Deliverables:**
- Case notes UI
- Comms log entry UI
- Database integration

---

### 8. Finishing Details

**Requirements:**

**Error Handling:**
- Global error boundary / toast notifications

**Loading States:**
- Loading skeletons on lists

**Empty States:**
- No cases
- No evidence
- No mandates

**Data Scoping:**
- Ensure all DB calls include `org_id` scoping
- Ensure RLS errors are handled gracefully

**Analytics:**
- Add basic analytics events (local only) for:
  - evidence captured
  - upload success/fail
  - mandate completion %

**Performance:**
- FlatList optimisations
- Thumbnail rendering
- Signed URL caching

**Deliverables:**
- Error boundary component
- Toast notification system
- Loading skeletons
- Empty state components
- Analytics tracking
- Performance optimisations

---

## Section 3: Admin Suite (Internal Control Panel)

### Overview

Build the **Refrag Admin Suite** (internal control panel) for Refrag staff only. This is **NOT** for assessors. It is used by the Refrag admin team to manage organisations, users, roles, subscriptions, support operations, analytics, and platform health.

### Tech Stack

**Core:**
- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Supabase Postgres + Auth + Storage
- RLS enforced everywhere
- Separate "Refrag staff" access model: staff users can see cross-tenant data; customers cannot.
- Use strict audit logging for all admin actions.

### Core Modules

1. **Admin Auth + staff role gating**
2. **Org management:** view orgs, status, plan, created date, active users, last activity
3. **User management:** search users, reset password flow (trigger email), disable users
4. **Access control:** assign/remove org members, set roles (owner/admin/member)
5. **Subscription & billing metadata** (no payment integration required yet)
6. **Support tools:** impersonation (safe/read-only), case lookup, export logs, evidence viewer
7. **Analytics:** usage metrics, adoption funnel, feature usage, mandate completion, upload failures
8. **Data products:** anonymised insights dashboards (aggregations only)
9. **System health:** error logs, background job status, storage usage, rate limiting flags
10. **Compliance & audit:** admin audit logs, data access logs, exports logs

### Design Requirements

- Minimal, enterprise-trust aesthetic aligned with Refrag brand.
- Separate `/admin` route group from customer `/app` routes.
- Same core color palette as main app

**Deliverable:** Schema additions + RLS + full admin app scaffold.

---

## Admin Suite Database Schema

### New Tables/Types

#### A) staff_users
- `id` (uuid pk)
- `user_id` (uuid fk → auth.users.id)
- `role` (enum: super_admin, admin, support, analyst)
- `is_active` (boolean default true)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique constraint:** (user_id)

#### B) organisations metadata (extend existing organisations table)

**New columns to add:**
- `status` (enum: active, trial, suspended, closed)
- `plan_name` (text, default 'refrag-standard')
- `billing_status` (enum: trialing, active, past_due, canceled)
- `billing_provider` (text nullable) - e.g. stripe
- `billing_customer_id` (text nullable)
- `subscription_started_at` (timestamptz nullable)
- `subscription_ends_at` (timestamptz nullable)

#### C) platform_events (telemetry)
- `id` (uuid pk)
- `org_id` (uuid nullable) - null allowed for pre-auth events
- `user_id` (uuid nullable)
- `event_name` (text) - e.g. 'case_created', 'evidence_uploaded', 'mandate_completed'
- `event_props` (jsonb)
- `created_at` (timestamptz)
- **Indexes:** (org_id, created_at), (event_name, created_at)

#### D) admin_audit_log
- `id` (uuid pk)
- `staff_user_id` (uuid fk → staff_users.id)
- `action` (text) - e.g. 'ORG_SUSPENDED', 'USER_DISABLED', 'ROLE_CHANGED'
- `target_type` (text) - org/user/case/export
- `target_id` (uuid nullable)
- `details` (jsonb)
- `created_at` (timestamptz)

#### E) data_access_log (for compliance)
- `id` (uuid pk)
- `staff_user_id` (uuid)
- `org_id` (uuid nullable)
- `resource` (text) - table name or logical resource
- `resource_id` (uuid nullable)
- `reason` (text nullable)
- `created_at` (timestamptz)

#### F) background_jobs (optional, for future)
- `id` (uuid pk)
- `job_type` (text) - export_generation, email_send, etc.
- `status` (enum: queued, running, failed, completed)
- `org_id` (uuid nullable)
- `case_id` (uuid nullable)
- `attempts` (int default 0)
- `last_error` (text nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Database Deliverables

**Output:** SQL migrations (create/alter), enums, indexes.

**Important:** Do NOT break existing customer schema.

---

## Admin Suite RLS Policies

### Rules

1. **Normal users** remain tenant-bound: they can only access orgs they belong to via `org_members`.
2. **Staff users** (exists in `staff_users` where `user_id = auth.uid()` and `is_active = true`) can access cross-tenant data in admin context.
3. **Staff actions must be auditable:**
   - Any admin read of sensitive resources should insert a row into `data_access_log` (via server action or RPC).
   - Any admin write should insert `admin_audit_log` entry.

### Helper SQL Functions

- `is_staff()` returns boolean
- `staff_role()` returns enum or text
- `is_org_member(org_id)` boolean
- `is_org_admin(org_id)` boolean

### Policy Pattern

- **For most tables:** SELECT allowed if `is_org_member(org_id)` OR `is_staff()`
- **INSERT/UPDATE/DELETE for customer users:** only within their org and their role.
- **INSERT/UPDATE/DELETE for staff:** allowed when `is_staff()` and action is logged at app layer.

### Tables Requiring Extra Caution

- **evidence:** staff can SELECT metadata; signed URLs must be generated server-side with explicit reason logged.
- **exports:** staff can view; downloading requires logging.

**Deliverable:** SQL: enable RLS + policies + helper functions.

---

## Admin Suite Application Scaffolding

### Routes

- `/admin/login` - Admin login (uses Supabase auth)
- `/admin` - Dashboard
- `/admin/orgs` - Organisation list
- `/admin/orgs/[orgId]` - Organisation detail
- `/admin/users` - User list
- `/admin/users/[userId]` - User detail
- `/admin/cases` - Cross-tenant case search
- `/admin/exports` - Exports management
- `/admin/analytics` - Analytics dashboard
- `/admin/insights` - Aggregated dashboards
- `/admin/system-health` - System health monitoring
- `/admin/audit` - Audit log viewer

### Middleware

**Requirements:**
- Must be authenticated
- Must be staff (`is_staff()` true)
- If not staff → show "Access denied" page

### Layout

- Left navigation
- Top bar with staff role + quick search
- Refrag brand styling with the same core colours

### Deliverables

**Folder structure and key code files:**
- supabase server client for admin
- staff check util
- protected layout
- Route protection middleware

---

## Admin Suite Implementation Specifications

### 1. Admin Auth + Staff Role Gating

**Requirements:**
- Admin login using Supabase auth
- Staff role verification
- Route protection middleware
- Session management

**Implementation:**
- `/admin/login` screen
- Middleware checks `is_staff()` for all `/admin/*` routes
- Staff role display in UI
- Logout functionality

**Deliverables:**
- Auth flow
- Middleware implementation
- Staff verification utilities
- Protected layout component

---

### 2. Org Management

#### A) Org List: `/admin/orgs`

**Table Columns:**
- org name
- status
- plan_name
- active users count
- cases last 30d
- last activity (max platform_events.created_at)
- created_at

**Filters:**
- status
- plan
- activity

#### B) Org Detail: `/admin/orgs/[orgId]`

**Org Overview:**
- details + metadata
- set status (active/trial/suspended/closed)
- set plan_name
- set billing_status

**Org Members List:**
- users, roles
- add/remove member
- change role

**Activity:**
- recent platform_events
- exports count
- storage usage (approx, from evidence files_size sum)

**Audit:**
- Every admin change must write `admin_audit_log`

**Deliverables:**
- Org list component with filters
- Org detail page
- Status/plan update forms
- Member management UI
- Activity dashboard
- Audit logging integration

---

### 3. User Management

#### A) User List: `/admin/users`

**Search:**
- By email, name (if stored), org name, user_id

**Display:**
- email
- last login (if available)
- org memberships count
- status (active/disabled)
- created_at

#### B) User Detail: `/admin/users/[userId]`

**Profile Summary:**
- email
- org memberships list with roles

**Actions:**
- disable user (prevents login by RLS/logic)
- enable user
- trigger password reset email (Supabase auth reset)
- remove user from org (careful: cannot remove last owner)

**Support View:**
- recent activity events
- cases created / uploads

**Audit:**
- Log every action in `admin_audit_log`

**Deliverables:**
- User search and list
- User detail page
- User actions (disable/enable/reset password)
- Org membership management
- Activity view
- Audit logging

---

### 4. Access Control

**Functionality:**
- Assign/remove org members
- Set roles (owner/admin/member)
- Validation: cannot remove last owner

**Integration:**
- Part of org detail page (`/admin/orgs/[orgId]`)
- Part of user detail page (`/admin/users/[userId]`)

**Deliverables:**
- Role assignment UI
- Member add/remove functionality
- Validation logic
- Audit logging

---

### 5. Subscription & Billing Metadata

**Functionality:**
- View subscription details
- Update billing status
- View billing provider info
- Track subscription dates

**Note:** No payment integration required yet - metadata only.

**Integration:**
- Part of org detail page (`/admin/orgs/[orgId]`)

**Deliverables:**
- Billing metadata display
- Billing status update form
- Subscription date tracking

---

### 6. Support Tools

#### A) Case Search: `/admin/cases`

**Cross-tenant search by:**
- case_number
- claim_reference
- client_name
- org name

**Results show:**
- org
- case status
- created_at
- last updated
- evidence count
- report versions

#### B) Case Detail: `/admin/cases/[caseId]` (optional)

**Read-only case view:**
- Evidence list with thumbnails (generate signed URLs server-side only)
- Mandate checklist completion
- Exports list (download requires logging)

**Security:**
- Do NOT implement full impersonation yet.
- Instead implement "Read-only support view" with explicit reason field that writes to `data_access_log` whenever sensitive data is opened.

**Deliverables:**
- Case search interface
- Case detail view (read-only)
- Evidence viewer with signed URL generation
- Data access logging
- Export download with logging

---

### 7. Analytics Module

**Data Source:** `platform_events` aggregations

**Tracked Events** (insert them in customer apps later):
- `user_logged_in`
- `case_created`
- `evidence_captured`
- `evidence_uploaded`
- `mandate_assigned`
- `mandate_requirement_provided`
- `mandate_completed`
- `report_version_created`
- `report_marked_ready`
- `export_created`

#### A) Analytics Dashboard: `/admin/analytics`

**Metrics:**
- Active orgs (last 30 days)
- Active users (DAU/WAU/MAU)
- Cases created per week
- Evidence uploads per week
- Upload failure rate (from queue errors logged as events)
- Mandate completion rate per org
- Time-to-pack (case_created → export_created)
- Cohort style view: new orgs and their week-1 activation metrics

**Performance:**
- Use SQL views or server-side queries; keep it performant.

#### B) Org Drill-down: `/admin/analytics/orgs/[orgId]`

**Org-specific analytics dashboard**

**Deliverables:**
- Analytics dashboard with charts
- Event tracking integration points
- SQL aggregation queries
- Org drill-down view
- Performance optimisations

---

### 8. Data Products / Insights

**Route:** `/admin/insights`

**Purpose:** Aggregated dashboards that could later become sellable insurer products.

**Important:**
- No personally identifiable info
- No claim reference exposure
- Only aggregated and anonymised metrics across orgs (or per insurer_name if explicitly tagged and allowed)

**Example Insight Panels:**
- Evidence completeness distribution (required items completion)
- Most common missing requirements (top 10)
- Average time to completion by vertical (if vertical added later)
- Upload volume trends
- Rework proxy (number of report versions per case)
- Export frequency and turnaround

**Implementation:**
- SQL views / materialized views (optional)
- Simple charts (use a minimal chart lib)
- "Export CSV" button for insights datasets (admin only) with audit logging

**Deliverables:**
- Insights dashboard
- Aggregated metrics queries
- Chart components
- CSV export functionality
- Audit logging for exports

---

### 9. System Health

**Route:** `/admin/system-health`

**Metrics:**

**Storage Usage Summary:**
- evidence storage total by org
- exports storage total

**Background Jobs** (if table exists):
- queue size
- failed count
- last errors

**Error Monitoring Integration:**
- show last 50 app errors if stored in a table (optional)

**Rate-limiting Flags:**
- Future placeholder

**Deliverables:**
- System health dashboard
- Storage usage queries
- Background job monitoring
- Error log viewer
- Health status indicators

---

### 10. Compliance & Audit

**Route:** `/admin/audit`

**Features:**

**Admin Audit Log Viewer:**
- filter by staff user, action type, date range
- View all admin actions

**Data Access Log Viewer:**
- filter by staff user, org, resource
- Track all sensitive data access

**Export Logs:**
- exports created, by whom, when, for which org/case

**Requirements:**
- Every page must be fast, read-only by default, and safe.

**Deliverables:**
- Audit log viewer with filters
- Data access log viewer
- Export log viewer
- Search and filter functionality
- Performance optimisations

---

## Next Steps

1. ✅ Section 1 documented (Web App)
2. ✅ Section 2 documented (Mobile App)
3. ✅ Section 3 documented (Admin Suite)
4. ⏳ Plan execution strategy
