# Refrag — Execution Roadmap: From Base to Professional Case Engine

**Document Purpose:** A phased execution plan to evolve Refrag from its current state into a structured evidence-to-outcome engine for independent assessors, loss adjusters, and investigators. This roadmap incorporates the ChatGPT system design, codebase analysis, and strategic additions.

---

## Executive Summary

**Core Principle:** Refrag is not a claims system or insurer platform. It is a **structured evidence-to-outcome engine for independent professionals**. Everything revolves around:

- **Appointment** → **Evidence** → **Mandate** → **Outcome** → **Audit**

**Current State:** Phases 1–11 complete. You have: database schema, mobile app (cases, evidence, mandates, notes, offline queue), web app (case management, evidence, mandates, reports, comms, export), admin suite (orgs, users, analytics). No PWA manifest, no clients/rate matrix, no onboarding, no email ingestion, no invoicing, no recording/transcription.

**Target State:** A modular, cross-vertical professional operating environment with off-the-shelf onboarding, email-to-case ingestion, field workflow, recording/transcription, invoicing, and report compilation with logos.

---

## Part 1: Gap Analysis (Existing vs Target)

### 1.1 What Exists

| Area | Status | Notes |
|------|--------|-------|
| Database schema | ✅ | 17+ tables, RLS, admin tables |
| Auth (mobile + web) | ✅ | Supabase auth, org selection |
| Cases CRUD | ✅ | Mobile + web |
| Evidence capture | ✅ | Camera, gallery, docs, offline queue |
| Mandates & requirement checklist | ✅ | Mobile + web |
| Case notes & comms log | ✅ | Note channel only |
| Report builder | ✅ | Versioning, markdown sections |
| PDF export (Assessor Pack) | ✅ | Report + evidence list |
| Comms templates | ✅ | Placeholder support |
| Admin suite | ✅ | Orgs, users, cases, analytics |

### 1.2 What’s Missing (from ChatGPT Spec)

| Gap | Priority | Effort |
|-----|----------|--------|
| **Clients entity** | P0 | Medium |
| **Organisation profile** (logo, banking, certifications, signature) | P0 | Medium |
| **Rate matrix** (per-client billing) | P0 | Large |
| **Onboarding flow** (steps 1–4) | P0 | Large |
| **Mobile 5-tab structure** (Dashboard, Cases, Capture, Clients, Profile) | P0 | Medium |
| **Case status alignment** (New, Scheduled, On-site, Invoice Issued, etc.) | P0 | Small |
| **Email ingestion** (appointments@refrag.app) | P1 | Large |
| **Field workflow** (Start Visit, guided capture) | P1 | Medium |
| **Meeting recording + transcription** | P1 | Large |
| **Report logo + transcript excerpts** | P1 | Medium |
| **Invoicing** | P1 | Large |
| **In-app calls** (Twilio) | P2 | Large |
| **Cross-vertical abstraction** (incident_type, asset_type) | P0 | Medium |
| **PWA manifest + service worker** | P0 | Small |

### 1.3 Additional Strategic Additions

| Addition | Rationale |
|----------|-----------|
| **Recording consent** | GDPR/local legal requirements for call/meeting recording |
| **Geolocation tagging** | Verify site visit, evidence location |
| **Push notifications** | New appointments, upload failures, mandate reminders |
| **Case assignment** | Assign assessors, team workload visibility |
| **Appointment scheduling** | Visit date/time, calendar integration |
| **Digital signature** | Sign reports before submission |
| **Data export (GDPR)** | User data export on request |
| **Template variants per client** | Different report layouts per mandate/client |
| **Multi-language / multi-currency** | Expansion beyond single market |

---

## Part 2: Database Changes Required

### 2.1 New Tables

#### `clients`
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_type TEXT, -- insurer, fintech, fleet_manager, private, etc.
  contact_email TEXT,
  contact_phone TEXT,
  billing_email TEXT,
  default_mandate_id UUID REFERENCES mandates(id),
  default_report_template TEXT, -- template key
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `client_rate_structures`
```sql
CREATE TABLE client_rate_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rate_type TEXT NOT NULL, -- flat_fee, hourly, per_km, add_on_investigation, add_on_report
  amount DECIMAL(12,2) NOT NULL,
  unit TEXT, -- per_assessment, per_hour, per_km
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `client_rate_matrices` (labour, parts, markups — for report output)
```sql
CREATE TABLE client_rate_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  key TEXT NOT NULL, -- labour_rate, parts_markup_pct, slas_days
  value_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `organisations` — extend
```sql
-- Add columns
ALTER TABLE organisations ADD COLUMN legal_name TEXT;
ALTER TABLE organisations ADD COLUMN registration_number TEXT;
ALTER TABLE organisations ADD COLUMN vat_number TEXT;
ALTER TABLE organisations ADD COLUMN logo_storage_path TEXT;
ALTER TABLE organisations ADD COLUMN banking_details JSONB;
ALTER TABLE organisations ADD COLUMN address TEXT;
ALTER TABLE organisations ADD COLUMN certification_storage_path TEXT;
ALTER TABLE organisations ADD COLUMN signature_storage_path TEXT;
ALTER TABLE organisations ADD COLUMN country TEXT;
```

#### `invoices`
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'draft', -- draft, issued, paid, overdue
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  storage_path TEXT,
  meta JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `recordings` (meetings, calls)
```sql
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  recording_type TEXT NOT NULL, -- meeting, call
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript_text TEXT,
  transcript_storage_path TEXT,
  consent_recorded BOOLEAN DEFAULT false,
  external_call_sid TEXT, -- Twilio SID for calls
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `inbound_emails` (email ingestion)
```sql
CREATE TABLE inbound_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
  raw_subject TEXT,
  raw_from TEXT,
  raw_body TEXT,
  attachments_meta JSONB,
  parsed_json JSONB, -- extracted claim data
  case_id UUID REFERENCES cases(id), -- linked case after creation
  status TEXT DEFAULT 'pending', -- pending, reviewed, case_created, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `appointments` (visit scheduling)
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  address TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 Schema Modifications

#### Cases
- Add `client_id UUID REFERENCES clients(id)` (nullable for migration)
- Add `insurer_reference TEXT` (keep `claim_reference` for backwards compatibility; ChatGPT: Refrag = RF-ORG-YEAR-SEQ, insurer ref stored separately)
- Consider `incident_type TEXT`, `asset_type TEXT`, `identifier_1 TEXT`, `identifier_2 TEXT` for cross-vertical
- Extend `case_status` enum: add `new`, `scheduled`, `on_site`, `awaiting_info`, `invoice_issued` (or migrate existing)

#### Evidence
- Add `latitude DECIMAL`, `longitude DECIMAL` for geolocation
- Add `recording_id UUID REFERENCES recordings(id)` for evidence linked to recordings

#### Reports
- Add `logo_storage_path TEXT` (override org logo if needed)
- Report sections: support transcript block type for insertion

### 2.3 Case Number Format

Current: `ORGSLUG-YYYY-XXXX`.  
Target: `RF-{ORG}-{YEAR}-{SEQ}` (as per ChatGPT).

Implement sequential numbering per org/year via database sequence or `MAX(case_number)` + 1.

---

## Part 3: Onboarding Architecture

### 3.1 Onboarding Flow (Off-the-shelf, Deep)

**Step 1: Create Account**
- Email, password
- Company name
- Country

**Step 2: Company Profile**
- Legal name
- Registration number
- VAT number
- Logo upload
- Banking details
- Address
- Certification upload (optional)
- Signature upload (for reports)

**Step 3: Add Clients**
- Client name, type
- Contact email(s), phone
- Billing email
- Default report template
- Default mandate (optional)
- Billing structure: flat fee, hourly, per km, add-ons

**Step 4: Rate Matrix (Optional)**
- Labour rate references
- Panelbeater rates, markups, parts handling %, SLAs
- Required evidence types per client

**Implementation:**
- New route group: `/(onboarding)/` in web app (and/or mobile)
- Wizard-style multi-step form
- Skip/optional steps where appropriate
- Store completion state in `organisations` or `org_members` metadata
- Redirect to dashboard when complete; allow “finish later” to add clients incrementally

---

## Part 4: Mobile App Structure (5 Tabs)

### 4.1 Tab Layout

Replace current case-centric navigation with bottom tab bar (max 5 tabs):

| Tab | Purpose | Contents |
|-----|---------|----------|
| **1. Dashboard** | Landing view | Today’s appointments, pending actions, uploads in progress, draft reports. Quick: New Case, Scan Email (future), Record Meeting |
| **2. Cases** | Case list | Filter by client, status, search. Status badges |
| **3. Capture** | Quick capture | Capture photo/video, Record meeting, Start call (future), Add note, Attach document — without drilling into a case (case picker if needed) |
| **4. Clients** | Client access | Client list, mandates, rate structures, contact details |
| **5. Profile / Settings** | Company & app | Company profile, logo, billing, templates, certifications, subscription |

### 4.2 Implementation

- Use `expo-router` tabs: create `app/(app)/(tabs)/_layout.tsx` with `Tabs` navigator
- Move `cases`, `cases/[id]`, etc. under tabs
- Create new screens: Dashboard, Capture (standalone), Clients list/detail, Profile
- Ensure org selection still works before tabs

---

## Part 5: Web App (PWA) Structure

### 5.1 PWA Requirements

- `manifest.json`: name, short_name, icons, theme_color, start_url, display: standalone
- Service worker: cache static assets, optional offline fallback
- Install prompt: “Add to Home Screen”

### 5.2 Web App Navigation (Extend)

- Add **Clients** to sidebar
- Add **Invoicing** section (or under Settings)
- Add **Email ingestion** review (e.g. `/app/inbound` or under Settings)
- Keep: Dashboard, Cases, Settings

### 5.3 PWA vs Mobile Responsibilities

| Mobile | PWA |
|--------|-----|
| Field execution | Business management |
| Quick capture, Start Visit | Reporting, invoicing |
| Case list, mandate checklist | Analytics, export |
| Client quick ref | Transcription review |
| | Email ingestion |
| | Template management |

---

## Part 6: Appointment Ingestion (Email → Case)

### 6.1 Flow

1. User forwards appointment email to `appointments@refrag.app` (or similar)
2. Backend (webhook from Resend/SendGrid/Postmark) receives email
3. Parse: insurer reference, insured name, contacts, address, attached claim form
4. Create `inbound_emails` row, status `pending`
5. Create draft case with status `new`, flag “Review required”
6. User reviews in PWA, confirms/edits, assigns client, mandate

### 6.2 Implementation

- Email service: Resend Inbound, SendGrid Inbound Parse, or Postmark
- Parser: rule-based + optional AI (OpenAI) for unstructured text
- API route: `POST /api/inbound/email` (webhook)
- UI: `/app/inbound` list and review modal
- Case number: Refrag assigns `RF-{ORG}-{YEAR}-{SEQ}`; insurer reference stored in `insurer_reference`

### 6.3 Attachments

- Store claim form PDFs in Storage
- Link to `inbound_emails` and optionally to case

---

## Part 7: Field Workflow (“Going Out”)

### 7.1 “Start Visit” Screen

When assessor taps Start Visit on an appointment/case:

- Client name, address, contact
- Mandate checklist summary
- Required evidence list
- “Start Recording” with consent checkbox

### 7.2 On-Site Needs

1. **Guided capture** — Required photos as checklist, quick capture, tag suggestions
2. **Notes** — Structured: Damage, Liability, Observations; optional voice-to-text
3. **Record meeting** — Consent checkbox, audio stored, transcribed, linked to case
4. **In-app call** (future) — Call logged, recorded if permitted, transcript stored

All tied to: Case → Evidence → Mandate → Outcome.

### 7.3 Implementation

- `appointments` table for scheduled visits
- “Start Visit” updates case status to `on_site`
- Capture tab or case evidence screen shows mandate-driven checklist
- Recording: `expo-av` or native recorder → upload → transcription service (Whisper, etc.)

---

## Part 8: Post-Field Workflow

1. Status → `awaiting_report` (or `reporting`)
2. Show: missing mandate items, incomplete notes, failed uploads
3. PWA: build report, insert transcript excerpts, add logo, generate PDF
4. Generate invoice (from client rate structure)
5. Mark invoice issued, track payment (optional)

---

## Part 9: Staged Execution Roadmap

### Stage 1 — Foundation & Data Model (Weeks 1–2)

**Goal:** Clients, org profile, case model updates.

| Task | Details |
|------|---------|
| DB migration | `clients`, `client_rate_structures`, `client_rate_matrices` |
| DB migration | Extend `organisations` (legal_name, logo, banking, etc.) |
| DB migration | Cases: `client_id`, `insurer_reference` |
| DB migration | Case number format RF-ORG-YEAR-SEQ |
| API + UI | Clients CRUD (web) |
| API + UI | Organisation profile edit (web) |
| API + UI | Case form: link to client, insurer reference |

**Deliverables:** Clients entity, org profile, cases linked to clients.

---

### Stage 2 — Onboarding (Weeks 2–3)

| Task | Details |
|------|---------|
| Onboarding flow | Multi-step wizard (web) |
| Steps | Account → Company Profile → Add Clients → Rate Matrix (optional) |
| Storage | Logo, certification, signature buckets |
| Completion check | Redirect logic, “finish later” |

**Deliverables:** New users complete profile and add first client.

---

### Stage 3 — Mobile Restructure (Weeks 3–4)

| Task | Details |
|------|---------|
| Tab navigation | 5 tabs: Dashboard, Cases, Capture, Clients, Profile |
| Dashboard | Today’s appointments, pending actions |
| Capture tab | Quick capture without opening case (with case picker) |
| Clients screen | List, detail, mandates, rates |
| Profile screen | Company profile, settings |

**Deliverables:** Mobile app matches ChatGPT structure.

---

### Stage 4 — PWA & Report Enhancement (Week 4)

| Task | Details |
|------|---------|
| PWA | manifest.json, service worker, install prompt |
| Report | Logo in PDF header |
| Report | Transcript excerpt block type |
| Web nav | Clients in sidebar |

**Deliverables:** Installable PWA, branded reports.

---

### Stage 5 — Email Ingestion (Weeks 5–6)

| Task | Details |
|------|---------|
| DB | `inbound_emails` table |
| Email service | Resend/SendGrid/Postmark inbound |
| Webhook | Parse email, create draft case |
| UI | Inbound list, review, confirm/create case |

**Deliverables:** Forward email → draft case with “Review required”.

---

### Stage 6 — Appointments & Field Workflow (Weeks 6–7)

| Task | Details |
|------|---------|
| DB | `appointments` table |
| UI | Create/edit appointment from case |
| Mobile | “Start Visit” flow |
| Mobile | Guided capture by mandate |
| Case status | `scheduled`, `on_site` |

**Deliverables:** Visit scheduling and on-site flow.

---

### Stage 7 — Recording & Transcription (Weeks 7–9)

| Task | Details |
|------|---------|
| DB | `recordings` table |
| Mobile | Record meeting (expo-av) |
| Backend | Audio upload, transcription (Whisper API or similar) |
| UI | Transcript storage, link to case |
| Report | Insert transcript excerpts |

**Deliverables:** Meeting recording, transcript in case and report.

---

### Stage 8 — Invoicing (Weeks 9–10)

| Task | Details |
|------|---------|
| DB | `invoices` table |
| Logic | Calculate from `client_rate_structures` |
| PDF | Invoice PDF generation |
| UI | Invoice list, create, issue, mark paid |

**Deliverables:** Per-client invoicing from cases.

---

### Stage 9 — In-App Calls (Weeks 10–12)

| Task | Details |
|------|---------|
| Twilio | Integration |
| Mobile | Place call from app |
| Backend | Call recording, transcription |
| DB | Link `recordings` to case |

**Deliverables:** In-app calls with recording and transcript.

---

### Stage 10 — Cross-Vertical & Polish (Ongoing)

| Task | Details |
|------|---------|
| Schema | incident_type, asset_type, identifier_1/2 |
| Mandates | Vertical-specific requirement keys |
| Consent | Recording consent checkbox, audit |
| Push | Notifications for appointments, uploads |
| Geolocation | Optional lat/long on evidence |

**Deliverables:** Flexible for loss adjusters, investigators, engineers.

---

## Part 10: Outside-the-Box Additions

### 10.1 Compliance & Legal
- Recording consent flow and audit trail
- Data retention settings per org
- GDPR data export endpoint

### 10.2 Team & Assignment
- Case assignment to assessors
- Workload dashboard
- Handoff notes

### 10.3 Integrations
- Calendar sync (Google, Outlook)
- Webhook for external systems
- Future: insurer API (if desired)

### 10.4 Intelligence
- Mandate completion suggestions
- Duplicate case detection
- Anomaly flags (e.g. unusual cost patterns)

### 10.5 Distribution
- App Store / Play Store submission
- PWA install from website
- White-label options (future)

---

## Part 11: Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Email parsing accuracy | Start rule-based; add AI for edge cases |
| Transcription cost | Use Whisper; consider tiered limits |
| Twilio complexity | Start with manual call logging; add VoIP later |
| Migration of existing cases | `client_id` nullable; backfill or leave unlinked |

---

## Part 12: Success Criteria

- [ ] New user completes onboarding and adds ≥1 client
- [ ] Assessor forwards email → draft case appears
- [ ] Mobile: 5 tabs, Capture works without opening case
- [ ] Report includes logo and transcript excerpts
- [ ] Invoice generated from client rates
- [ ] Meeting recording → transcript → case
- [ ] PWA installable from web
- [ ] Works for motor, property, investigation (cross-vertical)

---

## Part 13: Execution Order Summary

```
Stage 1  → Foundation (clients, org profile, case model)
Stage 2  → Onboarding
Stage 3  → Mobile 5-tab restructure
Stage 4  → PWA + report logo/transcript
Stage 5  → Email ingestion
Stage 6  → Appointments + field workflow
Stage 7  → Recording + transcription
Stage 8  → Invoicing
Stage 9  → In-app calls
Stage 10 → Cross-vertical + polish
```

**Estimated total:** ~12 weeks for core vision (Stages 1–8). Stages 9–10 can run in parallel or follow.

---

**Document Version:** 1.1  
**Last Updated:** 2025-02-12  

**Completed (2025-02-12):**
- Stage 1: Case number format RF-ORG-YEAR-SEQ (sequential) — migration 002, API updated
- Stage 4: PWA manifest.json, service worker, install prompt, icons
- Stage 4: Report logo in PDF header — org profile logo upload, PDF generation with logo
- Stage 3: Mobile 5-tab structure — Dashboard, Cases, Capture, Clients, Profile

**Next Step:** Stage 2 — Onboarding flow; Stage 5 — Email ingestion.
