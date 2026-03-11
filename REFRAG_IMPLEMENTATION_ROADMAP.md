# Refrag — Implementation Roadmap

**Document Purpose:** Defines what we need to do to get Refrag from its current state to the target state described in `REFRAG_VISION_AND_TARGET_STATE.md`. Build all structural changes first; API integrations follow — except Stripe, which is real from the start.

**Document Date:** 2026-02-14  
**Document Version:** 2.0

---

## Part 1: Current State (What Exists)

### 1.1 Database Schema

| Table | Status | Notes |
|-------|--------|-------|
| organisations | Done | Extended with legal_name, logo, banking, etc. (migration 001) |
| org_members | Done | |
| cases | Done | client_id, insurer_reference added (migration 001) |
| case_contacts | Done | |
| mandates | Done | |
| mandate_requirements | Done | |
| case_mandates | Done | |
| evidence | Done | |
| evidence_tags | Done | |
| requirement_checks | Done | |
| reports | Done | |
| report_sections | Done | |
| exports | Done | |
| comms_templates | Done | |
| comms_log | Done | |
| audit_log | Done | |
| case_notes | Done | |
| clients | Done | Migration 001 |
| client_rate_structures | Done | Migration 001 |
| client_rate_matrices | Done | Migration 003 |
| inbound_emails | Done | Migration 003 |
| appointments | Done | Migration 003 |
| recordings | Done | Migration 003 (transcript_text, consent_recorded) |
| invoices | Done | Migration 003 |
| staff_users, platform_events, admin_audit_log, data_access_log, background_jobs | Done | Admin schema |

### 1.2 Missing Tables

| Table | Purpose |
|-------|---------|
| **intake_documents** | Instruction document uploads (PDF, email, scan), link to case after confirmation |
| **extracted_fields** | OCR-extracted fields with confidence, per intake_document |
| **case_risk_items** | Risk items per case (motor vehicle, building, contents, etc.) — flexible case assets |
| **valuation_snapshots** | Lightstone API response stored with provider + timestamp |
| **transactions** | Report Pack checkout via Stripe, payment logging |
| **client_rules** | Per-client rule engine (write-off %, settlement basis, parts policy, etc.) |

### 1.3 Missing Columns

| Table | Column | Purpose |
|-------|--------|---------|
| organisations | specialisations | JSONB array of selected specialisations (motor, property, loss_adjuster, investigator) |
| cases | primary_risk_item_id | FK to case_risk_items for the primary risk item |
| cases | repair_estimate_amount | Repair estimate for write-off calculation |
| cases | write_off_status | null / economic / structural_code_3 / structural_code_3a / structural_code_4 / repairer_declined |

### 1.4 Applications

| App | Status | Key Features |
|-----|--------|--------------|
| **Web App** | Done | Dashboard, Cases, Clients, Appointments, Inbound, Invoices, Settings |
| **Mobile App** | Done | 5 tabs (Dashboard, Cases, Capture, Clients, Profile), evidence, mandates |
| **Admin Suite** | Done | Orgs, users, analytics |

### 1.5 Gaps (What Needs Building)

| Area | Status | Priority |
|------|--------|----------|
| **Risk items model** (case_risk_items) | Not built | P0 |
| **Instruction document intake** (3 channels: PDF, email, scan) | Not built | P0 |
| **OCR pipeline** (extraction, normalisation, confidence) | Not built | P0 |
| **Human confirmation UI** | Not built | P0 |
| **Client rule engine** | Not built | P0 |
| **Write-off logic** (economic, structural, no-estimate) | Not built | P0 |
| **Org specialisation** (onboarding selection) | Not built | P0 |
| **Valuation integration** (Lightstone adapter) | Not built | P1 |
| **Report Pack checkout** (Stripe, real) | Not built | P1 |
| **Transcription flow** | Not built | P1 |
| **Email outbound** (Resend) | Not built | P1 |

---

## Part 2: Build Order

**Principle:** Build all schema, UI, and logic flows first. Use mocks for Google Vision, Lightstone, and OpenAI. Stripe is real from the start. Integrate remaining APIs once structure is proven.

| Phase | Focus | APIs |
|-------|-------|------|
| **A** | Schema & Data Model | None |
| **B** | Org Specialisation & Risk Items | None |
| **C** | Instruction Document Intake (3 channels) | Mock Vision |
| **D** | Rule Engine & Client Onboarding Extension | None |
| **E** | Valuation Adapter & Write-Off Logic | Mock Lightstone |
| **F** | Report Pack Checkout | **Real Stripe** |
| **G** | Transcription Flow | Mock OpenAI |
| **H** | API Integrations | Real Vision, Lightstone, OpenAI, Resend |

---

## Part 3: Detailed Implementation Tasks

---

### Phase A: Schema & Data Model

**Goal:** Add all missing tables and columns. No external API calls.

#### A.1 Create `intake_documents` table

```sql
CREATE TABLE intake_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT NOT NULL,          -- application/pdf, message/rfc822, image/jpeg, etc.
  source_type TEXT NOT NULL,           -- pdf_upload, email_file, scan_photo
  status TEXT DEFAULT 'pending',       -- pending, extracting, extracted, confirmed, rejected
  raw_text TEXT,                       -- Full extracted text
  extraction_method TEXT,              -- pdf_text, vision_ocr, email_parse
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_intake_documents_org_id ON intake_documents(org_id);
CREATE INDEX idx_intake_documents_status ON intake_documents(status);
CREATE INDEX idx_intake_documents_case_id ON intake_documents(case_id);
```

#### A.2 Create `extracted_fields` table

```sql
CREATE TABLE extracted_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  intake_document_id UUID NOT NULL REFERENCES intake_documents(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,             -- insurer_reference, policy_number, vin, etc.
  value TEXT NOT NULL,
  confidence TEXT NOT NULL,            -- high, medium, low
  extraction_method TEXT DEFAULT 'rule',  -- rule, ai_fallback
  label_matched TEXT,                  -- Which label matched (audit trail)
  confirmed_value TEXT,                -- User-confirmed value (may differ from extracted)
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (intake_document_id, field_key)
);
CREATE INDEX idx_extracted_fields_intake_doc ON extracted_fields(intake_document_id);
CREATE INDEX idx_extracted_fields_org_id ON extracted_fields(org_id);
```

#### A.3 Create `case_risk_items` table

```sql
CREATE TABLE case_risk_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  risk_type TEXT NOT NULL,             -- motor_vehicle, building, contents, stock,
                                       -- business_interruption, goods_in_transit, other
  cover_type TEXT,                     -- comprehensive, third_party, buildings, household_contents, etc.
  description TEXT,                    -- Free text description of the risk item
  asset_data JSONB DEFAULT '{}',       -- Type-specific structured data (see below)
  valuation_snapshot_id UUID,          -- Latest valuation for this risk item
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_case_risk_items_case_id ON case_risk_items(case_id);
CREATE INDEX idx_case_risk_items_org_id ON case_risk_items(org_id);
CREATE INDEX idx_case_risk_items_risk_type ON case_risk_items(risk_type);
```

**`asset_data` JSONB by risk_type:**

Motor vehicle:
```json
{
  "vin": "WBA...",
  "registration": "CA 123-456",
  "make": "BMW",
  "model": "320i",
  "year": 2022,
  "engine_number": "N20B20...",
  "mm_code": "12345",
  "colour": "White",
  "odometer_km": 45000
}
```

Building:
```json
{
  "address": "123 Main St",
  "erf_number": "ERF 456",
  "municipal_value": 1500000,
  "property_type": "residential",
  "construction_type": "brick_and_mortar"
}
```

Contents / Stock / Other:
```json
{
  "description": "Household contents",
  "estimated_value": 250000
}
```

#### A.4 Create `valuation_snapshots` table

```sql
CREATE TABLE valuation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  risk_item_id UUID REFERENCES case_risk_items(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'lightstone',
  provider_request_id TEXT,
  request_payload JSONB DEFAULT '{}',
  response_payload JSONB NOT NULL,     -- Full Lightstone response (flexible for motor + property)
  retail_value DECIMAL(12,2),          -- Motor: retail. Property: replacement cost.
  trade_value DECIMAL(12,2),           -- Motor: trade. Property: municipal value.
  market_value DECIMAL(12,2),          -- Market value where applicable.
  decode_data JSONB,                   -- Decoded make/model/year/specs for motor
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_valuation_snapshots_case_id ON valuation_snapshots(case_id);
CREATE INDEX idx_valuation_snapshots_risk_item_id ON valuation_snapshots(risk_item_id);
CREATE INDEX idx_valuation_snapshots_org_id ON valuation_snapshots(org_id);
```

#### A.5 Create `transactions` table

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  export_id UUID REFERENCES exports(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL,       -- report_pack_base, valuation_enrichment, transcript_enrichment
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'pending',        -- pending, completed, failed, refunded
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  meta JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transactions_org_id ON transactions(org_id);
CREATE INDEX idx_transactions_case_id ON transactions(case_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_stripe ON transactions(stripe_payment_intent_id);
```

#### A.6 Create `client_rules` table

```sql
CREATE TABLE client_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,              -- write_off_threshold_pct, settlement_basis, etc.
  rule_value JSONB NOT NULL,           -- e.g. {"value": 30}, {"value": "retail"}, etc.
  description TEXT,                    -- Human-readable description for UI
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, rule_key)
);
CREATE INDEX idx_client_rules_client_id ON client_rules(client_id);
CREATE INDEX idx_client_rules_org_id ON client_rules(org_id);
```

**Standard rule keys:**

| rule_key | rule_value example | Description |
|----------|-------------------|-------------|
| `write_off_threshold_pct` | `{"value": 30}` | Write-off at 30% of retail |
| `settlement_basis` | `{"value": "retail"}` | retail / trade / market |
| `parts_policy` | `{"value": "alternate_allowed"}` | oem_only / alternate_allowed / mixed |
| `approved_labour_rate` | `{"value": 450, "currency": "ZAR"}` | Per hour |
| `approved_storage_rate` | `{"value": 150, "currency": "ZAR"}` | Per day |
| `structural_write_off_codes` | `{"codes": ["3", "3a", "4"]}` | SA vehicle codes that trigger automatic write-off |

#### A.7 Extend `organisations`

```sql
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS specialisations JSONB DEFAULT '[]';
-- e.g. ["motor_assessor", "property_assessor"] or ["loss_adjuster"]
```

#### A.8 Extend `cases`

```sql
ALTER TABLE cases ADD COLUMN IF NOT EXISTS primary_risk_item_id UUID;
-- FK added after case_risk_items exists
ALTER TABLE cases ADD COLUMN IF NOT EXISTS repair_estimate_amount DECIMAL(12,2);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS write_off_status TEXT;
-- null | economic | structural_code_3 | structural_code_3a | structural_code_4 | repairer_declined
```

#### A.9 RLS for new tables

All new tables: org-scoped SELECT/INSERT/UPDATE/DELETE for org members; staff can SELECT.

- `intake_documents`
- `extracted_fields`
- `case_risk_items`
- `valuation_snapshots`
- `transactions`
- `client_rules`

---

### Phase B: Org Specialisation & Risk Items

**Goal:** Org selects specialisations at onboarding; cases have risk items instead of flat vehicle fields.

#### B.1 Onboarding: specialisation selection

- Add step to onboarding flow (or settings): select specialisations.
- Checkboxes: Motor assessor, Property assessor, Loss adjuster, Investigator, General.
- Save to `organisations.specialisations` JSONB.
- Specialisation shapes: which risk item types are available, which mandate templates are suggested, which report templates appear, which valuation options show.

#### B.2 Case creation: primary risk item

- When creating a case (manual or from intake), user sets a primary risk item.
- Risk item type selected from available types (filtered by org specialisation).
- Type-specific fields appear based on selection (motor → VIN, registration, etc.; property → address, erf, etc.).
- Saved to `case_risk_items` with `is_primary = true`.
- `cases.primary_risk_item_id` set to the new risk item ID.

#### B.3 Case detail: add/edit risk items

- Case detail shows primary risk item prominently.
- "Add risk item" button for additional items (e.g. contents on a motor claim).
- Each risk item editable with type-specific fields.
- Risk items list on case detail page.

#### B.4 UI adaptation by specialisation

- Motor-focused orgs: VIN and registration fields prominent, motor valuation button visible.
- Property-focused orgs: address and erf fields prominent, property valuation button visible.
- Loss adjusters / general: all risk item types available, UI doesn't assume motor-first.

---

### Phase C: Instruction Document Intake (3 Channels)

**Goal:** Build the full intake pipeline with three drop zones. Mock Google Vision for scanned/image documents.

#### C.1 Storage bucket

- Create `intake-documents` bucket in Supabase Storage.
- Path: `org/{org_id}/intake/{intake_document_id}/{filename}`

#### C.2 Intake UI: three drop zones

On the case creation screen (or a dedicated `/app/intake` page):

**Zone 1: "Drop PDF here"**
- Accepts `.pdf` files.
- Drag-and-drop or click to browse.
- Routes to PDF text extraction pipeline.

**Zone 2: "Drop email here"**
- Accepts `.eml` / `.msg` files.
- System parses email: extracts body text + pulls out attachments.
- Body text goes through normalisation + extraction.
- PDF/image attachments also processed through their respective pipelines.
- Guidance text: "Drag the email file from your inbox, or save as .eml and drop here."

**Zone 3: "Scan / Take photo"**
- On mobile: opens camera.
- On web: file picker for `.jpg`, `.png`, `.tiff`.
- Routes to Vision OCR pipeline.
- Guidance text: "Take a photo of the instruction document or upload a scanned image."

All three create an `intake_document` record with appropriate `source_type` and `content_type`.

#### C.3 Text extraction layer

| Source | Method | Library/API |
|--------|--------|-------------|
| PDF with text layer | Direct extraction | `pdf-parse` (npm) |
| Scanned PDF / Image | OCR | Google Vision `document_text_detection` (mock for now) |
| Email file (.eml) | Email parsing | `mailparser` (npm) for .eml; extract body + attachments |
| Email file (.msg) | Email parsing | `@nicklason/msg-parser` or similar for Outlook .msg |

**Mock Vision:** For scanned/image documents, return placeholder text until Google Vision API is integrated. PDF text extraction works without any API.

#### C.4 Normalisation function

```
normaliseExtractedText(rawText: string) → { flatText: string, keyValuePairs: { label: string, value: string }[] }
```

- Clean line breaks, extra spacing, mixed casing, table artifacts.
- Detect `label: value` and `label value` patterns.
- Detect tabular structures (label in one column, value in adjacent).

#### C.5 Global label dictionary

Config file in codebase:

```json
{
  "common": {
    "insurer_reference": ["Claim Number", "Claim Ref", "SEB Claim Number", "Reference", "Our Ref"],
    "policy_number": ["Policy No", "Policy Number", "Pol No"],
    "date_of_loss": ["Date of Loss", "DOL", "Loss Date"],
    "insured_name": ["Insured", "Policyholder", "Insured Name"],
    "contact_phone": ["Phone", "Contact Number", "Cell", "Mobile"],
    "insurer_name": ["Insurer", "Underwriter"],
    "cover_type": ["Cover Type", "Comprehensive", "Third Party"],
    "appointment_date": ["Appointment", "Inspection Date", "Assessment Date"],
    "loss_address": ["Address", "Loss Address", "Location", "Premises"]
  },
  "motor": {
    "vehicle_registration": ["Registration", "Reg No", "Licence Plate", "Registration Number"],
    "vin": ["VIN", "Chassis Number", "Chassis No"],
    "engine_number": ["Engine No", "Engine Number"],
    "mm_code": ["MM Code", "Make/Model Code"],
    "vehicle_make": ["Make"],
    "vehicle_model": ["Model"],
    "vehicle_year": ["Year", "Year of Manufacture"]
  },
  "property": {
    "property_address": ["Property Address", "Premises", "Risk Address"],
    "erf_number": ["Erf Number", "Erf No", "Stand Number"],
    "property_type": ["Property Type", "Building Type"]
  }
}
```

Which sections of the dictionary to apply depends on org specialisation and/or the detected risk item type.

#### C.6 Rule-based extraction engine

```
extractFields(normalisedText, labelDictionary, applicableSections) → ExtractedField[]
```

- For each field key in applicable sections, search for label matches.
- **Exact match** → high confidence.
- **Fuzzy match** (partial, case-insensitive) → medium confidence.
- **Multiple candidates** for one field → low confidence.
- Apply regex validation: VIN pattern (17 chars), date patterns, phone patterns.
- Insert into `extracted_fields`.

#### C.7 Human confirmation UI

- **Flow:**
  1. Upload/drop document → processing indicator.
  2. Extraction completes → show confirmation screen.
  3. Fields displayed in a form: field name, extracted value, confidence badge (green/amber/red).
  4. User can edit any field inline.
  5. User selects or confirms risk item type (pre-suggested if motor fields found, etc.).
  6. **"Create Case"** → Creates case + primary risk item from confirmed fields, links `intake_document`, status `confirmed`.
  7. **"Add to existing case"** → Links document to an existing case (for supplementary instructions).
  8. **"Reject"** → Status `rejected`.

#### C.8 Case creation from confirmed fields

- Map confirmed fields to: `cases` (insurer_reference, loss_date, client association), `case_risk_items` (asset_data from motor/property fields), `case_contacts` (insured name, phone).
- Set case status to `draft`.
- Audit log: `INTAKE_CONFIRMED`, `CASE_CREATED_FROM_INTAKE`.

---

### Phase D: Rule Engine & Client Onboarding Extension

**Goal:** Client onboarding captures rules; rule engine drives assessment logic and report output.

#### D.1 Client onboarding: rules section

Extend client add/edit form with a "Rules" section:

| Field | Input Type | Stored As |
|-------|-----------|-----------|
| Write-off threshold % | Number input | `write_off_threshold_pct` |
| Settlement basis | Dropdown: retail / trade / market | `settlement_basis` |
| Parts policy | Dropdown: OEM only / alternate allowed / mixed | `parts_policy` |
| Approved labour rate | Currency input (ZAR) | `approved_labour_rate` |
| Approved storage rate | Currency input (ZAR per day) | `approved_storage_rate` |
| Structural write-off codes | Multi-select: Code 3, 3a, 4 | `structural_write_off_codes` |

Save to `client_rules` table. All optional — assessor can add later.

#### D.2 Rule engine service

```ts
interface ClientRules {
  writeOffThresholdPct: number | null;
  settlementBasis: 'retail' | 'trade' | 'market' | null;
  partsPolicy: 'oem_only' | 'alternate_allowed' | 'mixed' | null;
  approvedLabourRate: number | null;
  approvedStorageRate: number | null;
  structuralWriteOffCodes: string[];
}

getClientRules(clientId: string): Promise<ClientRules>
```

Used by: write-off logic, report generation, estimate sections.

#### D.3 Write-off evaluation logic

```ts
evaluateWriteOff(caseId: string): Promise<WriteOffEvaluation>
```

Returns:

```ts
interface WriteOffEvaluation {
  status: 'none' | 'economic' | 'structural' | 'repairer_declined' | 'insufficient_data';
  details: string;                     // Human-readable explanation
  repairEstimate: number | null;
  valuationRetail: number | null;
  threshold: number | null;            // Calculated threshold amount
  structuralCode: string | null;       // Code 3, 3a, 4 if applicable
  suggestedReportText: string | null;  // Pre-filled recommendation text
}
```

**Logic:**
1. If `write_off_status` already manually set → return that.
2. If structural code set on case → `structural`, economics irrelevant.
3. If repair estimate AND valuation AND client write-off % exist → calculate economic threshold.
4. If repair estimate missing → `insufficient_data` with reminder to assessor.
5. Never block — always return a result the UI can use to suggest or remind.

#### D.4 Write-off prompt UI (case detail)

When `evaluateWriteOff` returns a finding:

- **Economic write-off:** Banner: "This may be uneconomical to repair based on [Client]'s threshold of X%. Repair R45,000 vs threshold R42,000."
  - Actions: "Update report recommendation" / "Advise repairer" / "Dismiss"
- **Structural write-off:** Banner: "Structural write-off — [Code 3a]. Repair economics do not apply."
  - Actions: "Update report recommendation" / "Dismiss"
- **Repairer declined:** Banner: "Repairer has declined to quote. Consider noting impracticality in report."
  - Actions: "Update report recommendation" / "Dismiss"
- **Insufficient data:** Subtle reminder: "Missing [estimate / valuation / client rules] — write-off evaluation not possible yet."

"Update report recommendation" → pre-fills report recommendation section with suggested text. Assessor edits before saving.

"Advise repairer" → opens comms template pre-filled for panelbeater contact. Logged in `comms_log`.

---

### Phase E: Valuation Adapter & Write-Off Logic

**Goal:** Adapter pattern for Lightstone. Mock responses until real API key.

#### E.1 Valuation adapter interface

```ts
interface ValuationAdapter {
  fetchMotorValuation(params: MotorValuationRequest): Promise<ValuationResponse>;
  fetchPropertyValuation(params: PropertyValuationRequest): Promise<ValuationResponse>;
}

interface MotorValuationRequest {
  vin?: string;
  registration?: string;
  make?: string;
  model?: string;
  year?: number;
}

interface PropertyValuationRequest {
  address?: string;
  erfNumber?: string;
}
```

#### E.2 Mock Lightstone adapter

Returns plausible mock data for development/testing:
- Motor: retail_value, trade_value, market_value, decode_data (make, model, year, specs).
- Property: replacement_cost, municipal_value.
- Insert into `valuation_snapshots` with `provider = 'lightstone_mock'`.

#### E.3 API route

- `POST /api/cases/[caseId]/risk-items/[riskItemId]/valuation`
- Reads risk item `asset_data` for VIN/registration/address.
- Calls appropriate adapter method (motor or property based on risk_type).
- Stores snapshot, links to risk item.
- Triggers write-off evaluation.

#### E.4 UI

- Case detail → risk item → "Fetch Valuation" button (visible when risk item has enough data).
- Display latest valuation snapshot (retail, trade, market, decode data).
- After valuation + repair estimate: write-off prompt appears automatically.

---

### Phase F: Report Pack Checkout (Real Stripe)

**Goal:** Real Stripe Checkout for Report Pack generation.

#### F.1 Stripe setup

- Stripe account, API keys, webhook endpoint.
- Products/prices configured in Stripe: Base Pack, Valuation Enrichment, Transcript Enrichment.
- Env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.

#### F.2 Checkout flow

1. User clicks "Generate Report Pack" on case export page.
2. Select enrichments: Base (required), +Valuation (optional), +Transcript (optional).
3. Price calculated and displayed.
4. "Proceed to checkout" → creates Stripe Checkout Session.
5. User completes payment on Stripe-hosted page.
6. Webhook: `checkout.session.completed` → create `transaction` with status `completed`.
7. Export unlocked.

#### F.3 API routes

- `POST /api/checkout/create-session` — Creates Stripe Checkout Session.
- `POST /api/checkout/webhook` — Handles Stripe webhook events.
- `GET /api/checkout/session/[sessionId]` — Check session status.

#### F.4 Export gating

- Before generating export: check `transactions` for completed payment for this case + pack type.
- If not paid → redirect to checkout.
- After payment → generate PDF, store in Storage, create `exports` record.

---

### Phase G: Transcription Flow (Mock OpenAI)

**Goal:** Recording upload → transcript. Mock until OpenAI key.

#### G.1 Recording upload (exists)

- `recordings` table already exists. Ensure upload flow works on mobile + web.
- `consent_recorded` must be `true` before any transcription processing.

#### G.2 Transcription API

- `POST /api/recordings/[id]/transcribe`
- Check `consent_recorded = true`.
- Mock: Set `transcript_text` = "MOCK: Transcription would appear here once OpenAI is integrated."
- Real (Phase H): Call OpenAI Speech-to-Text (Whisper), store result.
- Update `recordings.transcript_text` and `recordings.transcript_storage_path`.
- Audit log: `RECORDING_TRANSCRIBED`.

#### G.3 Transcript in report

- New report section type / block: "Transcript excerpt".
- Report builder: "Insert transcript" button → select recording → insert transcript text.
- Assessor can edit the excerpt before saving.

---

### Phase H: API Integrations (Replace Mocks)

| API | Integration Point | Env Vars | Notes |
|-----|-------------------|----------|-------|
| Google Cloud Vision | Phase C — OCR for scanned/image docs | `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_VISION_API_KEY` | Replace mock OCR |
| Lightstone | Phase E — Motor + property valuation | `LIGHTSTONE_API_KEY`, `LIGHTSTONE_API_URL` | Replace mock adapter |
| OpenAI Speech-to-Text | Phase G — Transcription | `OPENAI_API_KEY` | Replace mock transcribe |
| Resend | Outbound email (comms, invoices, reports) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | New integration |
| Stripe | Phase F — Already real | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Already integrated |

---

## Part 4: Task Checklist

### Schema & Migrations

- [ ] Migration: `intake_documents` table
- [ ] Migration: `extracted_fields` table
- [ ] Migration: `case_risk_items` table
- [ ] Migration: `valuation_snapshots` table (with risk_item_id)
- [ ] Migration: `transactions` table (with Stripe fields)
- [ ] Migration: `client_rules` table
- [ ] Migration: Extend `organisations` (specialisations JSONB)
- [ ] Migration: Extend `cases` (primary_risk_item_id, repair_estimate_amount, write_off_status)
- [ ] RLS policies for all new tables

### Org Specialisation & Risk Items

- [ ] Onboarding: specialisation selection UI + save
- [ ] Case creation: primary risk item selection with type-specific fields
- [ ] Case detail: risk items list, add/edit risk items
- [ ] UI adaptation by org specialisation

### Instruction Document Intake

- [ ] Storage bucket `intake-documents`
- [ ] Three-zone intake UI (PDF, email, scan/photo)
- [ ] PDF text extraction (`pdf-parse`)
- [ ] Email file parsing (`.eml` via `mailparser`, `.msg` via parser)
- [ ] Mock Vision OCR for scanned/image documents
- [ ] Normalisation function
- [ ] Global label dictionary config (common + motor + property sections)
- [ ] Rule-based extraction engine with confidence scoring
- [ ] Human confirmation UI (field form, confidence badges, edit, create case / add to case / reject)
- [ ] Case creation from confirmed fields (with risk item)

### Rule Engine

- [ ] Client rules section in client add/edit form
- [ ] `getClientRules` service
- [ ] `evaluateWriteOff` logic (economic, structural, repairer declined, insufficient data)
- [ ] Write-off prompt UI (banners, actions: update report / advise repairer / dismiss)
- [ ] "Update report recommendation" pre-fill
- [ ] "Advise repairer" comms template

### Valuation

- [ ] Valuation adapter interface (motor + property)
- [ ] Mock Lightstone adapter
- [ ] `POST /api/cases/[caseId]/risk-items/[riskItemId]/valuation`
- [ ] Valuation UI on case detail (fetch, display, per risk item)
- [ ] Write-off auto-evaluation after valuation fetch

### Checkout (Stripe)

- [ ] Stripe account + product/price setup
- [ ] `POST /api/checkout/create-session`
- [ ] `POST /api/checkout/webhook`
- [ ] Checkout UI (select enrichments, price display, proceed)
- [ ] Export gating by transaction status

### Transcription

- [ ] `POST /api/recordings/[id]/transcribe` (mock)
- [ ] Consent check before transcribe
- [ ] Transcript insert in report builder
- [ ] Transcript edit before save

### API Integrations (Later)

- [ ] Google Cloud Vision (replace mock OCR)
- [ ] Lightstone (replace mock adapter)
- [ ] OpenAI Speech-to-Text (replace mock transcribe)
- [ ] Resend (outbound email for comms, invoices, reports)

---

## Part 5: Ease of Use Checklist (Assessor Lens)

- [ ] Three clear intake channels: PDF, email, scan — no confusion
- [ ] Case from instruction: upload → confirm → case in under 60 seconds
- [ ] Confidence visible: green/amber/red badges on extracted fields
- [ ] One-click "Create Case" or "Add to existing case" from confirmation
- [ ] Risk items flexible: motor, property, contents, etc. — not locked to one type
- [ ] Write-off logic suggests but never blocks — assessor decides
- [ ] "Update report" and "Advise repairer" are one-click actions from prompts
- [ ] Report generation: < 5 minutes once data captured
- [ ] Invoice from case: no re-entry, auto from client rates
- [ ] Checkout feels professional (Stripe hosted, clear pricing)
- [ ] Transcript insertable into report with editing

---

## Part 6: Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| OCR accuracy varies by insurer | Global label dictionary + human confirmation; improve over time |
| Email .msg parsing complexity | Start with .eml (simpler); add .msg support iteratively |
| Lightstone API contract timing | Mock adapter lets us build everything first |
| Stripe webhook reliability | Implement idempotent webhook handler; verify session status on export |
| Risk items JSONB schema drift | Define clear schemas per type; validate with Zod on read/write |
| Cross-vertical UI complexity | Specialisation filtering keeps UI clean per org type |

---

## Part 7: Execution Summary

**Build order:**

1. **Schema** (Phase A) — All new tables and columns.
2. **Org specialisation + Risk items** (Phase B) — Flexible case assets.
3. **Instruction intake** (Phase C) — Three channels, extraction, confirmation.
4. **Rule engine** (Phase D) — Client rules, write-off logic, prompts.
5. **Valuation** (Phase E) — Lightstone adapter (mock), UI, write-off evaluation.
6. **Checkout** (Phase F) — Real Stripe from the start.
7. **Transcription** (Phase G) — Mock, transcript in report.
8. **API integrations** (Phase H) — Replace mocks with real keys.

**Estimated effort:** 8–10 weeks for Phases A–G. Phase H adds 1–2 weeks per API integration.

---

**Document Version:** 2.0  
**Last Updated:** 2026-02-14
