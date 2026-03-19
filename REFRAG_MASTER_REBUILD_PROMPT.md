# REFRAG — MASTER REBUILD SPECIFICATION PROMPT
**Version:** 3.1  
**Status:** Authoritative rebuild brief  
**Supersedes:** All previous phase documents, REFRAG_PROJECT_SPEC.md, REFRAG_VISION_AND_TARGET_STATE.md  

---

## EXPLICIT DESIGN DECISIONS (READ FIRST)

These decisions were made by the product owner and are not open for reinterpretation:

| Decision | Answer |
|----------|--------|
| How different is the UI per professional type? | **Same core shell (5 tabs), different content** — terminology, accordion sections, templates, and financial logic change. No separate navigation structure per vertical. |
| Are both pay-per-pack and subscription available from day one? | **Yes — both modes available at signup.** New orgs choose on registration and can switch any time. 3 free credits on signup regardless of mode. |
| Where does the smart comms trigger system sit in priority? | **Core MVP — ships in Stage 2, same stage as onboarding.** It is not a later phase. Every document drop and status change must surface a contextual send prompt from day one. |
| International scope? | **Fully locale-agnostic from the start.** No hardcoded country, currency symbol, regulatory term, or vehicle identifier system anywhere. |
| Client / mandate rigour? | **First-class.** Client creation prompts for mandate + rate structure immediately. Mandate builder supports requirement groups and client-specific rules. |
| Valuation API for MVP? | **Document drop only.** Drag valuation printout → OCR extracts values. No live API. Printout goes to evidence and report pack automatically. |
| Reporting complexity? | **Simplified to 5-tab shell with accordion sections.** Progressive disclosure. Report builder has AI draft per section (opt-in, never auto-accepted) + live A4 preview. |

---

## HOW TO USE THIS DOCUMENT

This is the master prompt for rebuilding Refrag. Hand this entire document to Claude at the start of each build session. Every section is load-bearing. Do not skip sections. When Claude asks "what should I build next?" — point to the Stage that comes next in Part 18.

**API keys are not yet configured. Build all integrations with clean adapter interfaces so keys can be dropped in without code changes. Every external call must go through a service module, never called inline.**

---

## PART 1 — WHAT REFRAG IS (NON-NEGOTIABLE DEFINITION)

Refrag is a **professional case operating system** for independent assessors, investigators, and adjusters. It is not an insurer core system. It does not replace professional judgement. It structures, captures, and produces defensible outputs.

### The three things Refrag always does, regardless of vertical:
1. **Collect evidence** — structured, tagged, traceable
2. **Tally evidence in a meaningful way** — against a mandate, checklist, or requirement set appropriate to the professional type
3. **Produce reports** — professional, branded, auditable outputs that go to the instructing party

### What changes per vertical:
- Terminology (vehicle vs property vs subject)
- Tab structure in the case view
- Default mandate/checklist templates
- Report section structure and language
- Field schemas for risk items
- Valuation and financial logic (motor has repair estimates; investigation has time/disbursement; property has reinstatement values)

### What never changes:
- Core case lifecycle (instruction → evidence → mandate → outcome → report → invoice)
- Audit trail on all key actions
- Multi-tenant org isolation via RLS
- The assessor is always the professional — the system suggests, never forces
- Every output is versioned and traceable

---

## PART 2 — PROFESSIONAL VERTICALS

At onboarding, the organisation selects one or more professional types. This is the single most important configuration decision — it shapes terminology, default templates, field labels, report sections, and financial logic. **It does not create a completely different UI.** The shell is the same for every vertical. What changes is what's inside it.

### Design principle: one shell, configured content

Every org uses the same core case workspace layout (5-tab shell — see Part 8). What differs per vertical:
- **Terminology** — "vehicle" vs "property" vs "subject"; "repair estimate" vs "reinstatement value" vs "claim quantum"
- **Accordion sections** within tabs — which sections appear, their labels, their field sets
- **Default report template** — section headings, ordering, and stock language
- **Financial logic module** — motor uses repair/write-off calculator; property uses reinstatement/depreciation; investigator uses time/disbursement
- **Mandate requirement keys** — what gets seeded as default requirements
- **Comms template language** — "Quote received" vs "Contractor quote received" vs "Investigator fee estimate"

A loss adjuster who does both motor and property sees both accordion sections within the same tabs — they don't navigate to a different UI. The vertical selection at case creation controls which sections are active for that specific case.

### Supported verticals (MVP):

| Vertical | Terminology set | Financial module | Evidence defaults |
|----------|----------------|-----------------|-------------------|
| **Motor assessor** | Vehicle, VIN, repair, write-off, repairer, parts | Repair estimate + write-off threshold | VIN photo, odometer, damage angles, quotes |
| **Property assessor** | Property, site, reinstatement, loss, contractor | Reinstatement value + depreciation | Site photos, damage rooms, contractor quote |
| **Loss adjuster** | Claim, quantum, risk item, adjustment | Combined — motor + property + BI | Full evidence set across risk items |
| **Investigator / SIU** | Subject, referral, finding, recommendation, red flag | Time + disbursement tracking | Statements, documents, scene, timeline |
| **General** | Configurable at org level | User-defined | User-defined |

### What the vertical drives technically:

```typescript
interface VerticalConfig {
  id: 'motor_assessor' | 'property_assessor' | 'loss_adjuster' | 'investigator' | 'general'
  
  // Labels shown in UI
  terminology: {
    riskItem: string          // "Vehicle" | "Property" | "Risk item" | "Subject"
    identifier: string        // "VIN" | "Erf number" | "Reference" | "Subject ID"
    financialSummary: string  // "Repair estimate" | "Reinstatement value" | "Quantum" | "Fee note"
    outcome: string           // "Repair / Write-off" | "Loss recommendation" | "Finding"
    instructingParty: string  // "Insurer" | "Insurer" | "Instructing party" | "Referral source"
  }
  
  // Which accordion sections appear in each of the 5 tabs
  sections: {
    overview: SectionKey[]    // e.g. ['instruction_details', 'vehicle_details', 'contacts']
    capture: SectionKey[]     // e.g. ['evidence_grid', 'mandate_checklist', 'valuation_drop']
    assessment: SectionKey[]  // e.g. ['damage_labour', 'parts', 'tyres', 'values']
    report: SectionKey[]      // e.g. ['report_builder', 'outcome_financials']
    pack: SectionKey[]        // always ['pack_builder', 'invoice']
  }
  
  // Default report section headings
  reportSections: ReportSectionTemplate[]
  
  // Financial calculator to use
  financialModule: 'motor_repair' | 'property_reinstatement' | 'loss_adjuster' | 'time_disbursement' | 'none'
  
  // Default mandate requirement keys to seed
  defaultMandateKeys: string[]
  
  // Default comms templates to seed
  commsTemplateSet: string
}
```

### Implementation rule:
`VERTICAL_CONFIGS` is a static config object keyed by vertical ID. The case workspace reads `verticalConfig = VERTICAL_CONFIGS[case.vertical]` and renders accordingly. No `if (vertical === 'motor')` scattered through components — config object only. The tab shell never changes. The accordion sections within tabs are the variable.

---

## PART 3 — INTERNATIONAL ARCHITECTURE (LOCALE-AGNOSTIC)

**Core principle:** No hardcoded country assumptions anywhere in the codebase. The system must be operable from any country without code changes.

### What this means in practice:

**Currency:**
- All monetary values stored as `DECIMAL(15,4)` with a `currency_code TEXT` column (ISO 4217: ZAR, USD, GBP, KES, NGN, AUD, etc.)
- Currency set at org level during onboarding
- Display formatting uses the browser/device locale, not hardcoded symbols
- No `R` prefix hardcoded anywhere — use `Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode })`

**Valuation providers:**
- Valuation is an adapter interface: `ValuationProvider.fetchVehicleValue(params)` → `ValuationResult`
- Lightstone is one implementation of this interface (SA only)
- For MVP: valuation is document-based (drag printout → OCR extracts values) — no live API call required yet
- The printout drop zone accepts any valuation provider's printout; OCR extracts retail/trade/market/replacement values into a neutral schema

**Vehicle identification:**
- SA uses MM code (TransUnion/Lightstone identifier)
- Other markets use VIN decode, DVLA lookup, Autocheck, etc.
- Store `identifier_type TEXT` + `identifier_value TEXT` — not a hardcoded `mm_code` column
- Additional vehicle fields stored in `risk_item_data JSONB` keyed by vertical schema

**Regulatory/compliance:**
- POPIA (SA) is referenced in existing code but must be renamed to `data_protection_regime TEXT` at org level
- Consent requirements, retention periods, and data handling notes should be configurable per org, not hardcoded to SA law
- The system handles PII protection as a general principle, not POPIA-specifically

**Report templates:**
- No SA-specific language in default templates
- "Write-off" becomes configurable terminology: "total loss" (US/UK), "write-off" (SA/AU/NZ)
- Structural damage codes (SA: Code 3/3a/4) stored as `damage_classification_system TEXT` + `damage_code TEXT` — the system doesn't interpret the code, just records and presents it
- Labour rates labelled as `currency_per_hour`, not `R/hr`

**Address format:**
- All addresses stored as free-text `address TEXT` — no hardcoded city/province/postal code field structure
- Google Maps / address autocomplete used for standardisation, not a hardcoded address schema

**Timezone:**
- All timestamps stored as UTC
- Display in org's configured timezone

---

## PART 4 — DATABASE SCHEMA (COMPLETE, AUTHORITATIVE)

This supersedes all previous schema documents. Build migrations in this exact order.

### 4.1 Core configuration tables

```sql
-- Organisations (extended for international + vertical support)
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  slug TEXT UNIQUE NOT NULL,
  registration_number TEXT,
  vat_number TEXT,
  tax_identifier TEXT,                    -- generic: VAT, GST, EIN, etc.
  tax_identifier_label TEXT,             -- "VAT Number", "GST Number", etc.
  address TEXT,
  country_code TEXT NOT NULL DEFAULT 'ZA',  -- ISO 3166-1 alpha-2
  timezone TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
  currency_code TEXT NOT NULL DEFAULT 'ZAR', -- ISO 4217
  locale TEXT NOT NULL DEFAULT 'en-ZA',
  logo_storage_path TEXT,
  signature_storage_path TEXT,
  certification_storage_path TEXT,
  banking_details JSONB DEFAULT '{}',
  professional_types TEXT[] NOT NULL DEFAULT '{}',  -- ['motor_assessor','investigator',etc.]
  status TEXT NOT NULL DEFAULT 'trial',   -- trial, active, suspended, closed
  plan_id TEXT,                           -- references billing plan
  billing_status TEXT DEFAULT 'trialing', -- trialing, active, past_due, canceled
  billing_provider TEXT,
  billing_customer_id TEXT,
  billing_subscription_id TEXT,
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  report_pack_credits INTEGER DEFAULT 0,  -- pay-per-report credits remaining
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_step INTEGER DEFAULT 0,      -- 0=not started, 1-5=step, 6=complete
  stationery_primary_colour TEXT DEFAULT '#1F2933',
  stationery_accent_colour TEXT DEFAULT '#B4533C',
  stationery_text_colour TEXT DEFAULT '#1F2933',
  disclaimer_text TEXT,
  damage_classification_system TEXT,      -- 'SA_CODES', 'UK_CATEGORY', 'US_TOTAL_LOSS', custom
  write_off_terminology TEXT DEFAULT 'write-off', -- or 'total loss', 'write off', etc.
  data_protection_regime TEXT DEFAULT 'POPIA', -- 'GDPR', 'POPIA', 'PIPEDA', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Org members
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',  -- owner, admin, member
  display_name TEXT,
  job_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

-- Clients (insurers, brokers, fleet managers, private clients, etc.)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_type TEXT NOT NULL DEFAULT 'insurer', -- insurer, broker, fleet_manager, legal_firm, private, other
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  billing_email TEXT,
  address TEXT,
  country_code TEXT,
  default_mandate_id UUID,              -- fk added after mandates table
  default_report_template TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client rate structures (how this org bills THIS client)
CREATE TABLE client_rate_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                   -- e.g. "Standard motor assessment"
  rate_type TEXT NOT NULL,              -- flat_fee, hourly, per_assessment, per_km, daily
  amount DECIMAL(15,4) NOT NULL,
  currency_code TEXT NOT NULL,
  unit_label TEXT,                      -- "per assessment", "per hour", "per km"
  applies_to TEXT,                      -- motor, property, investigation, all
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client rules (what THIS client requires in reports/assessments)
CREATE TABLE client_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,               -- write_off_threshold_pct, settlement_basis, labour_rate_panel, parts_policy, etc.
  rule_value JSONB NOT NULL,            -- {"value": 30, "unit": "percent"} or {"value": "retail"} etc.
  label TEXT,                           -- human-readable label
  vertical TEXT DEFAULT 'all',          -- motor, property, all
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, rule_key, vertical)
);
```

### 4.2 Case and risk item tables

```sql
-- Cases
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  case_number TEXT NOT NULL,            -- RF-{ORG}-{YEAR}-{SEQ} generated server-side
  client_id UUID REFERENCES clients(id),
  insurer_reference TEXT,               -- insurer's own claim/reference number
  our_reference TEXT,                   -- org's internal reference
  vertical TEXT NOT NULL DEFAULT 'motor_assessor', -- drives tab set
  status TEXT NOT NULL DEFAULT 'new',   -- new, scheduled, on_site, awaiting_info, reporting, submitted, additional, closed
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  loss_date DATE,
  instruction_date DATE,
  appointment_date TIMESTAMPTZ,
  site_visit_started_at TIMESTAMPTZ,
  site_visit_completed_at TIMESTAMPTZ,
  report_submitted_at TIMESTAMPTZ,
  location TEXT,
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  notes TEXT,
  intake_source TEXT DEFAULT 'manual',  -- manual, email_ingestion, document_drop
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, case_number)
);

-- Case contacts (parties involved)
CREATE TABLE case_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL,             -- insured, broker, insurer_rep, claimant, witness, repairer, panelbeater, supplier, investigatee, legal_rep, other
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Risk items (what is being assessed/investigated)
CREATE TABLE risk_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true,
  risk_type TEXT NOT NULL,              -- motor_vehicle, building, contents, stock, business_interruption, goods_in_transit, liability, person, other
  description TEXT,
  identifier_type TEXT,                 -- vin, registration, erf_number, policy_number, serial_number, other
  identifier_value TEXT,
  asset_data JSONB DEFAULT '{}',        -- vertical-specific fields as JSONB
  cover_type TEXT,                      -- comprehensive, third_party, buildings, contents, etc.
  sum_insured DECIMAL(15,4),
  sum_insured_currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asset data JSONB schemas by risk_type (documentation only — enforced in app layer):
-- motor_vehicle: { make, model, year, colour, engine_number, transmission, fuel_type,
--                  body_type, mm_code, registration_number, odometer_km }
-- building:      { address, erf_number, property_type, construction_type, year_built,
--                  floor_area_m2, municipal_value, occupancy }
-- contents:      { description, category, estimated_quantity }
-- person:        { role, date_of_birth }   -- for injury/liability claims
```

### 4.3 Evidence and mandate tables

```sql
-- Evidence
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL,             -- photo, video, document, audio
  content_type TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  captured_at TIMESTAMPTZ,
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  notes TEXT,
  ai_classification TEXT,              -- AI-assigned category label
  ai_classification_confidence DECIMAL(5,4),
  is_valuation_document BOOLEAN DEFAULT false,  -- flagged by drop zone
  is_in_report_pack BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evidence tags
CREATE TABLE evidence_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mandates (requirement templates per client/insurer)
CREATE TABLE mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),  -- null = org-wide mandate
  name TEXT NOT NULL,
  vertical TEXT DEFAULT 'all',          -- motor_assessor, property_assessor, investigator, all
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mandate requirements
CREATE TABLE mandate_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  mandate_id UUID NOT NULL REFERENCES mandates(id) ON DELETE CASCADE,
  requirement_key TEXT NOT NULL,        -- VIN_PHOTO, DAMAGE_FRONT, STATEMENT_OBTAINED, etc.
  label TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  evidence_type TEXT,                   -- photo, video, document, text_note, none
  guidance_note TEXT,                   -- shown to assessor as hint
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case mandates (which mandates apply to this case)
CREATE TABLE case_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  mandate_id UUID NOT NULL REFERENCES mandates(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, mandate_id)
);

-- Requirement checks (per-case fulfilment of each mandate requirement)
CREATE TABLE requirement_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  mandate_requirement_id UUID NOT NULL REFERENCES mandate_requirements(id),
  status TEXT NOT NULL DEFAULT 'missing', -- missing, provided, not_applicable, waived
  evidence_id UUID REFERENCES evidence(id),
  note TEXT,
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, mandate_requirement_id)
);
```

### 4.4 Assessment tables (vertical-specific data)

```sql
-- Assessments (the structured work product within a case)
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  vertical TEXT NOT NULL,               -- matches case.vertical
  status TEXT NOT NULL DEFAULT 'draft', -- draft, in_progress, ready, submitted
  outcome TEXT,                         -- repairable, write_off, theft, partial_theft, rejection, further_investigation, finding (investigator)
  outcome_notes TEXT,
  financial_summary JSONB DEFAULT '{}', -- computed: totals, VAT, betterment, net settlement
  assessment_date DATE,
  assessor_name TEXT,                   -- denormalised for reports
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Repair line items (motor assessor)
CREATE TABLE repair_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,         -- panel, mechanical, electrical, paint, structural, trim, glass, other
  description TEXT NOT NULL,
  is_pre_existing BOOLEAN DEFAULT false,
  parts_cost DECIMAL(15,4) DEFAULT 0,
  labour_hours DECIMAL(8,2) DEFAULT 0,
  labour_rate DECIMAL(15,4) DEFAULT 0,
  paint_cost DECIMAL(15,4) DEFAULT 0,
  paint_materials_cost DECIMAL(15,4) DEFAULT 0,
  strip_assembly_cost DECIMAL(15,4) DEFAULT 0,
  frame_cost DECIMAL(15,4) DEFAULT 0,
  misc_cost DECIMAL(15,4) DEFAULT 0,
  qty INTEGER DEFAULT 1,
  betterment_applicable BOOLEAN DEFAULT false,
  betterment_percentage DECIMAL(5,2) DEFAULT 0,
  is_approved BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vehicle values (motor assessor — populated from valuation printout OCR)
CREATE TABLE vehicle_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  evidence_id UUID REFERENCES evidence(id),  -- the valuation printout document
  provider_name TEXT,                   -- 'Lightstone', 'TransUnion', 'Autocheck', 'Cazana', manual
  valuation_date DATE,
  retail_value DECIMAL(15,4),
  trade_value DECIMAL(15,4),
  market_value DECIMAL(15,4),
  replacement_value DECIMAL(15,4),
  currency_code TEXT NOT NULL,
  raw_extraction JSONB DEFAULT '{}',    -- everything OCR extracted, for audit
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tyre assessments (motor assessor)
CREATE TABLE tyre_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  position TEXT NOT NULL,               -- front_left, front_right, rear_left, rear_right, spare
  make TEXT,
  size TEXT,
  tread_depth_mm DECIMAL(4,2),
  condition TEXT,                       -- serviceable, worn, damaged, flat, missing
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, position)
);

-- Investigation findings (investigator vertical)
CREATE TABLE investigation_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  finding_number INTEGER NOT NULL,
  category TEXT,                        -- red_flag, factual_finding, timeline_discrepancy, document_finding, other
  description TEXT NOT NULL,
  significance TEXT DEFAULT 'medium',   -- low, medium, high, critical
  evidence_ids UUID[],                  -- array of evidence ids supporting this finding
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time and disbursements (investigator/loss adjuster billing)
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  entry_type TEXT NOT NULL,             -- time, disbursement, mileage
  description TEXT NOT NULL,
  hours DECIMAL(6,2),
  rate DECIMAL(15,4),
  amount DECIMAL(15,4) NOT NULL,
  currency_code TEXT NOT NULL,
  date DATE NOT NULL,
  is_billable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.5 Document ingestion and OCR tables

```sql
-- Intake documents (instruction PDFs, email attachments, valuation printouts)
CREATE TABLE intake_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id),    -- null until case is created/linked
  assessment_id UUID REFERENCES assessments(id),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT,
  file_size INTEGER,
  document_role TEXT NOT NULL,          -- instruction, valuation_printout, repairer_quote, parts_quote, statement, evidence_photo, other
  ocr_status TEXT DEFAULT 'pending',    -- pending, processing, complete, failed
  ocr_provider TEXT,                    -- google_vision, pdf_parse, manual
  raw_text TEXT,
  extracted_fields JSONB DEFAULT '{}',  -- field_key → {value, confidence, source_text}
  confirmed_fields JSONB DEFAULT '{}',  -- user-confirmed values
  pii_fields TEXT[],                    -- list of field keys that contain PII (never sent to AI)
  ai_audit_log JSONB DEFAULT '[]',      -- what was sent to AI (PII stripped)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inbound emails (appointment/instruction emails forwarded to Refrag)
CREATE TABLE inbound_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id),
  raw_subject TEXT,
  raw_from TEXT,
  raw_body TEXT,
  raw_html TEXT,
  attachments_meta JSONB DEFAULT '[]',
  parsed_json JSONB DEFAULT '{}',
  case_id UUID REFERENCES cases(id),
  status TEXT DEFAULT 'pending',        -- pending, reviewed, case_created, rejected
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.6 Reports, communications, and output tables

```sql
-- Reports (structured report within a case)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, ready, submitted
  title TEXT,
  executive_summary TEXT,
  vertical TEXT NOT NULL,               -- determines section template
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, version)
);

-- Report sections
CREATE TABLE report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  heading TEXT NOT NULL,
  body_md TEXT,                         -- markdown content
  is_ai_generated BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Report evidence links (which evidence is attached to which report section)
CREATE TABLE report_evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  section_key TEXT,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Report packs (the final deliverable bundle)
CREATE TABLE report_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  report_id UUID REFERENCES reports(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'draft',          -- draft, generating, ready, sent, paid
  storage_path TEXT,                    -- path to generated ZIP
  payment_status TEXT DEFAULT 'pending', -- pending, paid, credited, waived
  payment_amount DECIMAL(15,4),
  payment_currency TEXT,
  stripe_payment_intent_id TEXT,
  pack_credits_used INTEGER DEFAULT 0,
  meta JSONB DEFAULT '{}',              -- included item ids, settings
  sent_at TIMESTAMPTZ,
  sent_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Report pack items (toggleable items in the pack)
CREATE TABLE report_pack_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  report_pack_id UUID NOT NULL REFERENCES report_packs(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,              -- assessment_report, photo_evidence_pdf, valuation_doc, parts_quote, repairer_quote, invoice, statement, other
  label TEXT NOT NULL,
  evidence_id UUID REFERENCES evidence(id),
  intake_document_id UUID REFERENCES intake_documents(id),
  is_included BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  subtotal DECIMAL(15,4) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,4) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0.15,
  tax_label TEXT DEFAULT 'VAT',
  total DECIMAL(15,4) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL,
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  storage_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, invoice_number)
);

CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(8,2) DEFAULT 1,
  unit_label TEXT DEFAULT 'item',
  unit_price DECIMAL(15,4) NOT NULL,
  total DECIMAL(15,4) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Communications log
CREATE TABLE comms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  channel TEXT NOT NULL DEFAULT 'note', -- email, note, whatsapp, phone
  direction TEXT DEFAULT 'outbound',    -- outbound, inbound, internal
  to_recipients TEXT,
  cc_recipients TEXT,
  subject TEXT,
  body_md TEXT,
  template_id UUID REFERENCES comms_templates(id),
  resend_message_id TEXT,
  status TEXT DEFAULT 'logged',         -- logged, sent, delivered, failed
  trigger_event TEXT,                   -- what auto-triggered this (document_drop, status_change, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comms templates
CREATE TABLE comms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id), -- null = org-wide
  name TEXT NOT NULL,
  trigger_event TEXT,                   -- document_drop_quote, document_drop_instruction, status_change_submitted, etc.
  subject_template TEXT,
  body_template_md TEXT,
  recipient_type TEXT DEFAULT 'manual', -- manual, broker, insurer, insured, auto
  is_active BOOLEAN DEFAULT true,
  vertical TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.7 Audit, recordings, and platform tables

```sql
-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id),
  actor_user_id UUID REFERENCES auth.users(id),
  case_id UUID REFERENCES cases(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  address TEXT,
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recordings (meetings, calls)
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  recording_type TEXT NOT NULL,         -- meeting, call, interview
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript_text TEXT,
  transcript_storage_path TEXT,
  consent_recorded BOOLEAN DEFAULT false,
  consent_recorded_at TIMESTAMPTZ,
  transcription_status TEXT DEFAULT 'pending', -- pending, processing, complete, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform events (telemetry for admin analytics)
CREATE TABLE platform_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  user_id UUID,
  event_name TEXT NOT NULL,
  event_props JSONB DEFAULT '{}',
  vertical TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_platform_events_org ON platform_events(org_id, created_at DESC);
CREATE INDEX idx_platform_events_name ON platform_events(event_name, created_at DESC);

-- Staff users (admin suite only)
CREATE TABLE staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'support', -- super_admin, admin, support, analyst
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin audit log
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID REFERENCES staff_users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case notes
CREATE TABLE case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  body_md TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## PART 5 — THE ONBOARDING WIZARD

**This must ship before any marketing or sales outreach.**

The wizard runs at first login for a new organisation. It cannot be skipped entirely — steps 1–3 are mandatory, steps 4–5 are optional with clear "set up later" paths. A "Getting Started" card persists on the dashboard until `onboarding_completed_at` is set.

### Step 1 — Professional type selection
- Heading: "What kind of work do you do?"
- Multi-select cards (not a dropdown) with icon, title, and 1-line description:
  - Motor assessor — "Vehicle damage assessment and repair/write-off recommendations"
  - Property assessor — "Building and contents inspection and loss quantification"
  - Loss adjuster — "Multi-cover loss adjustment across motor, property, and BI"
  - Investigator / SIU — "Fraud investigation, liability, and general investigation"
  - General — "I do multiple types of work and want full flexibility"
- The selection drives everything else. If "motor assessor" only → no investigation tabs ever appear.
- Store in `organisations.professional_types[]`

### Step 2 — Company profile
- Legal company name (required)
- Registration number (label configurable: "Company Reg", "ABN", "EIN", etc.)
- Tax identifier + label (VAT, GST, etc. — both fields)
- Country (ISO 3166 selector — drives currency default and locale)
- Currency (auto-set from country, overridable)
- Address (free text)
- Logo upload (PNG/JPG/SVG, shown live in preview)
- Signature upload (for reports)

### Step 3 — Add first client
- Client name (required)
- Client type: Insurer | Broker | Fleet manager | Legal firm | Private | Other
- Contact email (for comms templates)
- Contact phone
- Billing email
- Then prompt: "Set billing rates for this client?" → Yes (inline mini-form) | Skip for now

### Step 4 — Assessment settings (vertical-dependent)
- If motor: default VAT rate, max repair % (write-off threshold), default labour rates by operation type
- If property: default depreciation rate, default reinstatement cost per m²
- If investigator: default hourly rate, daily rate
- These become org-level defaults; can be overridden per client

### Step 5 — Comms setup (optional)
- "Do you want to send emails directly from Refrag?"
- If yes: from-name, reply-to email (Resend integration activates when key is configured)
- Brief explanation of smart triggers: "Refrag can prompt you to send updates automatically when you add a quote or submit a report"

### Completion
- Show dashboard with "Getting Started" card listing incomplete items
- Card dismisses when all core items are set up

---

## PART 6 — SMART COMMS TRIGGER SYSTEM

This is a core feature, not an add-on. Every action that could warrant a communication to an external party must surface a contextual prompt. The assessor decides; the system facilitates.

### Trigger events and their prompts:

| Trigger Event | Prompt | Default Template | Recipient |
|--------------|--------|------------------|-----------|
| `document_drop_repairer_quote` | "Quote received — send update to broker?" | "Quote Received Update" | Broker contact |
| `document_drop_instruction` | "Instruction received — send acknowledgement?" | "Instruction Acknowledgement" | Insurer contact |
| `status_change_on_site` | "Site visit started — notify any parties?" | "Site Visit Commenced" | Optional |
| `status_change_reporting` | "Report in progress — send ETA to insurer?" | "Report in Progress" | Insurer contact |
| `status_change_submitted` | "Report submitted — notify broker and insurer?" | "Report Submitted" | Insurer + Broker |
| `mandate_missing_items` | "Missing required items — request info from insurer?" | "Additional Information Required" | Insurer contact |
| `invoice_issued` | "Invoice created — send to client?" | "Invoice" | Billing contact |
| `report_pack_ready` | "Pack ready — email to insurer?" | "Report Pack Delivery" | Insurer contact |
| `appointment_scheduled` | "Appointment set — send confirmation?" | "Appointment Confirmation" | Insured contact |

### Implementation:

**Trigger detection:** Every mutation (status change, document upload, mandate check) calls `checkCommsTrigger(event, caseId)`. This function:
1. Looks up active templates for this org + client with matching `trigger_event`
2. If found, resolves template placeholders with live case data
3. Returns `{ shouldPrompt: true, previewSubject, previewBody, suggestedRecipient }`

**UI presentation:** A non-blocking toast/slide-up appears:
- "Send update to [Broker Name]?" 
- Preview of subject line
- Two buttons: "Review & Send" | "Dismiss"
- "Review & Send" opens a side panel with full email preview, editable before sending

**Template placeholders (all verticals):**
```
{{CaseNumber}}, {{ClientName}}, {{InsurerName}}, {{BrokerName}}, 
{{InsuredName}}, {{ClaimReference}}, {{LossDate}}, {{AssessmentDate}},
{{AssessorName}}, {{Outcome}}, {{Location}}, {{AppointmentDate}},
{{InvoiceNumber}}, {{InvoiceTotal}}, {{InvoiceDue}}
```

**Sending:** Via Resend API (key configured in env). Until key is set, all sends are dry-run and logged as `status: 'draft'`.

**Logging:** Every send (or dismiss) creates a `comms_log` entry with `trigger_event` recorded.

**Default templates per vertical:** On org creation, seed `comms_templates` with vertical-appropriate defaults. Motor assessor gets different language from investigator.

---

## PART 7 — OCR INTAKE PIPELINE (COMPLETE IMPLEMENTATION)

This is the product's core differentiator. It must work reliably.

### 7.1 Architecture

All document drops go through a single pipeline: `POST /api/intake/process`

```
Upload file → Store in Supabase Storage (ingested-docs bucket)
→ Create intake_document record
→ Detect content type
→ Route to extraction:
    PDF with text layer → pdf-parse
    Scanned PDF/Image → Google Cloud Vision documentTextDetection
    Word doc → mammoth
→ Normalise text (strip artifacts, standardise whitespace)
→ Rule-based field extraction (label dictionary)
→ PII detection (regex — never sent to AI)
→ AI field extraction for missing/low-confidence fields (PII stripped)
→ Build extracted_fields with confidence scores
→ Return ExtractionResult to client
→ Show ExtractionReviewPanel (confidence badges, editable)
→ User confirms → fields applied to case/assessment
→ Document moves to evidence (if it's a valuation printout, quote, or statement)
```

### 7.2 Field extraction by document role

**Instruction document** — extracts into new case fields:
- `insurer_reference`, `policy_number`, `loss_date`, `insured_name`, `contact_phone`
- `insurer_name`, `cover_type`, `appointment_date`, `loss_address`
- Motor-specific: `vehicle_registration`, `vin`, `engine_number`, `vehicle_make`, `vehicle_model`, `vehicle_year`, `mm_code`
- Property-specific: `property_address`, `erf_number`, `property_type`

**Valuation printout** — extracts into `vehicle_values`:
- `retail_value`, `trade_value`, `market_value`, `replacement_value`
- `valuation_date`, `provider_name` (auto-detect from layout: Lightstone, TransUnion, etc.)
- Vehicle identifiers for cross-check against case
- The printout document is automatically added to evidence with `is_valuation_document: true`
- The printout is auto-added to `report_pack_items`

**Repairer/parts quote** — extracts into repair_line_items or as a document:
- Extracts line items if tabular format is detected
- Always adds document to evidence
- Auto-adds to `report_pack_items`
- Triggers `document_drop_repairer_quote` comms event

**Statement** — added to evidence, linked to case:
- Extracts: party name, date, key statements (AI-assisted, PII-ring-fenced)
- For investigator: auto-creates an investigation_finding stub

### 7.3 PII ring-fencing (mandatory)

```typescript
const PII_FIELDS = [
  'insured_name', 'contact_phone', 'contact_email', 
  'id_number', 'passport_number', 'banking_details',
  'address' // street addresses only — not loss location
]

// PII is extracted locally (regex), never sent to AI
// AI prompt receives text with PII placeholders: [NAME], [PHONE], [EMAIL]
// extracted_fields stores real values; ai_audit_log stores only the redacted prompt
```

### 7.4 Confidence scoring

```typescript
type ConfidenceLevel = 'high' | 'medium' | 'low'

// high: exact label match in dictionary, single unambiguous value
// medium: fuzzy label match, or value has multiple candidates
// low: AI-inferred, or no label found, value guessed from context
```

ExtractionReviewPanel shows:
- Green badge = high confidence (pre-checked)
- Amber badge = medium confidence (highlighted for review)
- Red badge = low confidence (flagged, required review before applying)
- PII fields show "Local only — not sent to AI" label

---

## PART 8 — REPORTING SIMPLIFICATION AND CASE WORKSPACE

The existing 9-tab assessment UI is overwhelming. The redesign principle is **progressive disclosure within a fixed shell**: the assessor always sees the same 5 tabs; the accordion sections inside each tab are driven by `VERTICAL_CONFIGS[case.vertical]`.

### 8.1 The 5-tab case workspace shell (all verticals)

```
[ Overview ]  [ Capture ]  [ Assessment ]  [ Report ]  [ Pack & Invoice ]
```

**Tab 1 — Overview**
Always contains: instruction details, key dates, contacts, mandate progress card, case notes. The sections within are vertical-driven:
- Motor: instruction details → vehicle summary → contacts → mandate progress
- Property: instruction details → property summary → contacts → mandate progress
- Investigator: referral details → parties summary → timeline → mandate progress

**Tab 2 — Capture**
The evidence hub. Always contains: evidence grid, document drop zones, mandate checklist inline. Sections:
- Motor: evidence grid → valuation printout drop → repairer quote drop → mandate checklist
- Property: evidence grid → contractor quote drop → contents list → mandate checklist
- Investigator: evidence grid → statement upload → document log → mandate checklist

The mandate checklist is visible here as a live sidebar/accordion — every upload auto-tags against open mandate requirements.

**Tab 3 — Assessment**
The structured work product. Vertical-driven accordion sections:
- Motor: damage & labour line items → parts assessment → tyre grid → values (populated from valuation printout)
- Property: damage sections (room/area by room/area) → contractor quotes → reinstatement values → contents inventory
- Loss adjuster: combines motor + property sections with a master quantum reconciliation section
- Investigator: findings list → timeline → parties & statements → red flags

**Tab 4 — Report**
Always: report builder with section accordions, live preview pane, outcome selector. Vertical-driven sections inside the builder. See 8.2 below.

**Tab 5 — Pack & Invoice**
Always: report pack builder (document cards, toggle in/out) + invoice builder. The pack builder shows what's in the pack as thumbnail cards. The invoice builder pre-fills from client rate structures.

### 8.2 Report builder simplification

Current state: separate markdown textarea per section, no guidance, no AI, no preview.

New design:
- Outcome selector at the top (e.g. "Repairable" / "Write-off" / "Finding: fraud indicators present") — this determines which report sections are relevant
- Section list with a one-line description of what belongs in each section
- Each section has: heading (editable) → content area → "Draft with AI" button
- "Draft with AI" sends relevant case data (non-PII) to OpenAI → returns a draft → assessor reviews, edits, then clicks "Accept draft" — it is never auto-accepted
- Sections that are complete show a green checkmark and collapse
- Incomplete required sections show an amber indicator
- A single progress bar: "5 of 7 sections complete"
- The right pane shows a live A4 preview, updating as sections are completed
- Vertical config determines which sections appear and their default headings

### 8.3 Mandate checklist integration

The mandate checklist is not a separate tab — it is woven in:
- **Overview tab:** compact progress card — "11 of 14 requirements met · 3 missing"
- **Capture tab:** full checklist as an accordion section, with quick-capture buttons per missing requirement
- **Report tab:** completeness warning if required items are unmet when "Mark ready" is clicked
- Missing items always surfaced at case level — never only visible inside a submenu

---

## PART 9 — BILLING MODEL

Both billing modes are available from day one. Every org chooses at signup and can switch at any time from their billing settings page.

### Mode 1: Pay-per-pack (credit-based)

Best for orgs with irregular volume or wanting to trial before committing.

- Each report pack generation costs 1 credit
- New orgs receive 3 free credits on signup (no card required)
- Credits purchased in bundles via Stripe Checkout:

| Bundle | Credits | Effective per-pack cost |
|--------|---------|------------------------|
| Starter | 5 | Highest per-pack |
| Standard | 20 | Mid |
| Value | 50 | Lower |
| Bulk | 100 | Lowest pay-per-pack rate |

- Unused credits never expire
- Credits can be topped up at any time
- If credits reach 0, pack generation is blocked with a clear prompt to top up

### Mode 2: Tiered subscription (monthly)

Best for orgs with consistent volume. Per-pack cost is lower than any credit bundle at equivalent volume.

| Tier | Packs included/month | Overage |
|------|---------------------|---------|
| Starter | 20 | Top-up credits at standard rate |
| Professional | 75 | Top-up credits at discounted rate |
| Studio | 200 | Top-up credits at bulk rate |
| Enterprise | Custom | Negotiated |

- Monthly billing via Stripe Billing (recurring)
- Pack counter resets on billing date
- Unused pack allowance does not roll over
- Overages auto-purchase top-up credits at the org's current tier rate — no manual action required
- Subscription can be paused (credits mode takes over) or cancelled (credits mode takes over)

### Billing settings page (`/app/settings/billing`)

Shows current mode prominently with a clear switch:

```
[ Pay-per-pack ]  [ Subscription ]   ← toggle

Current mode: Pay-per-pack
Credits remaining: 12
[Buy more credits]   [Switch to subscription]

--- OR ---

Current mode: Starter subscription
Packs used this month: 14 / 20
Next billing: 1 April · [Manage subscription]
[Switch to pay-per-pack]
```

- Billing history (last 12 invoices/credit purchases)
- Stripe Customer Portal link for card management
- Usage graph: packs generated per month (last 6 months)

### Implementation:

```typescript
// organisations table fields
report_pack_credits: INTEGER          // current credit balance (all modes)
plan_id: TEXT                         // stripe price id or null
billing_mode: TEXT                    // 'credits' | 'subscription'
billing_status: TEXT                  // trialing, active, past_due, canceled
monthly_pack_count: INTEGER           // resets on billing date
monthly_pack_limit: INTEGER           // null = unlimited (enterprise)
billing_period_start: TIMESTAMPTZ     // for monthly counter reset
stripe_customer_id: TEXT
stripe_subscription_id: TEXT

// Pack generation gate (server-side, atomic):
async function checkAndDeductPackCredit(orgId: string): Promise<'ok' | 'no_credits' | 'subscription_limit'>

// If billing_mode = 'credits': deduct 1 from report_pack_credits, fail if 0
// If billing_mode = 'subscription' and active:
//   if monthly_pack_count < monthly_pack_limit → increment monthly_pack_count
//   if monthly_pack_count >= monthly_pack_limit → auto-purchase overage credit, deduct 1
// All credit changes write an audit_log entry
```

### Stripe integration:
- Checkout (hosted): credit bundle purchases + new subscription signup
- Billing portal (hosted): subscription management, card updates
- Webhook: `POST /api/billing/webhook`
  - `payment_intent.succeeded` → top up credits
  - `invoice.payment_succeeded` → reset monthly counter, update billing_status
  - `customer.subscription.updated` → update plan_id, billing_status, monthly_pack_limit
  - `customer.subscription.deleted` → set billing_mode to 'credits', billing_status to 'canceled'
- No pricing hardcoded in UI — fetched from Stripe Products API or env config vars
- All Stripe IDs stored in `organisations` table

---

## PART 10 — UPLOAD QUEUE (MOBILE — RELIABILITY FIX)

**Replace AsyncStorage with expo-sqlite for the upload queue. This is not optional.**

The current implementation using AsyncStorage will fail under real field conditions (50+ photos, low connectivity, app backgrounding).

### New queue implementation:

```typescript
// src/lib/db/upload-queue.db.ts
// Uses expo-sqlite (or op-sqlite for better performance)

interface QueueItem {
  id: string               // UUID
  local_file_uri: string   // file:// path on device
  org_id: string
  case_id: string
  media_type: string       // photo, video, document, audio
  content_type: string
  file_name: string
  file_size: number
  tags: string[]           // JSON stringified
  notes: string
  captured_at: string      // ISO timestamp
  status: 'pending' | 'uploading' | 'failed' | 'complete'
  retry_count: number
  last_error: string
  created_at: string
}

// SQLite gives us:
// - Atomic transactions (no partial queue corruption)
// - No size limits
// - Query-able (SELECT WHERE status = 'pending' ORDER BY created_at)
// - Works when app is backgrounded via expo-background-fetch
```

**Queue processor:**
- Runs on app foreground (AppState change to 'active')
- Runs on network connectivity restored (NetInfo)
- Runs every 30 seconds when in foreground
- Max 3 concurrent uploads
- Exponential backoff: 30s, 2m, 10m, 30m, then manual retry only
- Failed items after 4 retries flagged as `failed` — shown in UI with error
- On upload success: creates `evidence` row in DB, creates `evidence_tags` rows, emits `platform_event('evidence_uploaded')`

---

## PART 11 — PLATFORM EVENT INSTRUMENTATION

Every feature must emit events. This is not optional — the admin suite is blind without it.

### Events to emit from web app and mobile app:

```typescript
// Call trackEvent(name, props) after every action
// Implementation: INSERT INTO platform_events (org_id, user_id, event_name, event_props, vertical)

'user_logged_in'         // { method: 'email' | 'magic_link' }
'case_created'           // { vertical, intake_source }
'case_status_changed'    // { from_status, to_status }
'document_dropped'       // { document_role, ocr_provider, field_count, confidence_avg }
'evidence_captured'      // { media_type, has_tags, mandate_linked }
'evidence_uploaded'      // { success: true/false, file_size }
'upload_queue_retry'     // { retry_count, error_type }
'mandate_assigned'       // { mandate_id }
'mandate_requirement_provided' // { requirement_key, has_evidence }
'mandate_completed'      // { total_required, total_provided }
'assessment_started'     // { vertical }
'assessment_outcome_set' // { outcome }
'report_section_drafted' // { section_key, ai_assisted: true/false }
'report_marked_ready'    // { section_count, ai_sections_count }
'report_submitted'       // {}
'report_pack_created'    // { item_count, payment_status }
'report_pack_paid'       // { credits_used, amount }
'invoice_created'        // { line_item_count, total }
'invoice_sent'           // {}
'comms_triggered'        // { trigger_event, sent: true/false }
'onboarding_step'        // { step, professional_types }
'onboarding_completed'   // { professional_types, client_count }
```

---

## PART 12 — CASE NUMBER GENERATION (SERVER-SIDE ONLY)

**Never generate case numbers client-side. Remove all client-side case number logic.**

```sql
-- Server-side sequence function
CREATE OR REPLACE FUNCTION generate_case_number(p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_slug TEXT;
  v_year TEXT;
  v_seq INTEGER;
  v_case_number TEXT;
BEGIN
  SELECT slug INTO v_slug FROM organisations WHERE id = p_org_id;
  v_year := to_char(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(split_part(case_number, '-', 4) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM cases
  WHERE org_id = p_org_id
  AND case_number LIKE 'RF-' || UPPER(v_slug) || '-' || v_year || '-%';
  
  v_case_number := 'RF-' || UPPER(v_slug) || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_case_number;
END;
$$ LANGUAGE plpgsql;
```

The API route `POST /api/cases` calls this function server-side. Mobile app receives the generated number in the response.

---

## PART 13 — SERVER-SIDE PDF GENERATION

**Browser print-to-PDF is not acceptable for production. All report PDFs must be server-generated.**

### Implementation:

```
POST /api/reports/[reportId]/generate-pdf
→ Fetch case, assessment, evidence, org stationery
→ Render report HTML with org branding (logo, colours, fonts)
→ Run Playwright headless: page.pdf({ format: 'A4', printBackground: true })
→ Store PDF in Supabase Storage: reports/org/{orgId}/case/{caseId}/report-v{version}.pdf
→ Return signed URL
```

**Stationery injection:**
- Logo: fetched from `organisations.logo_storage_path`, converted to base64 and inlined
- Primary colour: injected as CSS variable override
- Accent colour: injected as CSS variable override
- Footer: always includes `Powered by Refrag · refrag.app` at 7pt in light grey — non-removable

**Photo evidence PDF:**
- Separate route: `POST /api/reports/[reportId]/generate-photo-pdf`
- Each linked photo on its own page: image (fills 60% of page) + caption + AI tag + section label + timestamp
- Warns if any linked photo has no AI classification — offers to classify first

**ZIP generation:**
```
POST /api/report-packs/[packId]/generate-zip
→ Collects all included items:
   [CaseRef]_Assessment_Report.pdf
   [CaseRef]_Photo_Evidence.pdf
   [CaseRef]_Valuation_Printout.pdf  (if present)
   [CaseRef]_Repairer_Quote.pdf      (if present)
   [CaseRef]_Parts_Quote.pdf         (if present)
   [CaseRef]_Invoice.pdf             (if present)
→ Streams into JSZip
→ Stores ZIP in Storage: packs/org/{orgId}/case/{caseId}/{packId}.zip
→ Updates report_pack.storage_path + status = 'ready'
→ If payment is required, status stays 'awaiting_payment' until Stripe confirms
```

---

## PART 14 — CLIENT / MANDATE RIGOUR

This is a weak point in the current build. The client entity needs to be first-class.

### Client management requirements:

**Client profile (full):**
- Name, type, contact details, billing email
- **Mandate library:** List of all mandates associated with this client. Creating a client should prompt: "Add this client's requirements?" — which opens the mandate builder
- **Rate structure:** Billing rates for this client. On client creation, prompt for at least one rate.
- **Rules:** Write-off threshold, settlement basis, parts policy, labour rate references, approved repairers — all per-client
- **Report template:** Default report template for this client (or use org default)
- **Comms templates:** Custom email templates for this client (or use org defaults)

**Mandate builder (redesigned):**
- Create mandate → name + client + vertical
- Add requirements by category (not just a flat list):
  - **Identity documents** (VIN photo, registration disc, ID copy)
  - **Scene/damage photos** (specific angles required)
  - **Third-party documents** (quote, invoice, statement)
  - **Internal checks** (policy verification, endorsements)
  - **Specialist requirements** (structural inspection, FICA)
- Each requirement: label, required/optional, evidence type, guidance note for assessor
- Drag-and-drop reordering
- **Import from existing mandate** — clone another client's mandate as a starting point
- **Requirement groups** — "All of group required" vs "At least one from group required"

**Mandate assignment to case:**
- When a case is created with a `client_id`, auto-suggest the client's default mandate
- Mandate can be changed until the case is submitted
- Multiple mandates can be active on a case (e.g. insurer mandate + org internal checklist)

---

## PART 15 — RLS POLICIES (COMPLETE)

```sql
-- Helper functions
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_users 
    WHERE user_id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Apply to all tables: enable RLS, create org-scoped policies
-- Pattern for every table:
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY "{table}_select" ON {table} FOR SELECT USING (is_org_member(org_id) OR is_staff());
CREATE POLICY "{table}_insert" ON {table} FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "{table}_update" ON {table} FOR UPDATE USING (is_org_member(org_id));
CREATE POLICY "{table}_delete" ON {table} FOR DELETE USING (is_org_admin(org_id));

-- Special: audit_log — insert only, no update/delete
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (is_org_member(org_id) OR is_staff());

-- Special: platform_events — insert from authenticated users, select for staff only
CREATE POLICY "platform_events_insert" ON platform_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "platform_events_select" ON platform_events FOR SELECT USING (is_staff());
```

---

## PART 16 — EXTERNAL API ADAPTERS (INTERFACE-FIRST)

All external services must have clean adapter interfaces. Keys are added to env vars; no code changes needed.

### Required adapters:

```typescript
// src/lib/adapters/ocr.ts
interface OcrAdapter {
  extractText(buffer: Buffer, contentType: string): Promise<string>
}
// Implementations: GoogleVisionAdapter, PdfParseAdapter, MammothAdapter
// GoogleVisionAdapter uses GOOGLE_CLOUD_VISION_CREDENTIALS env var

// src/lib/adapters/ai-extraction.ts
interface AiExtractionAdapter {
  extractFields(text: string, schema: FieldSchema[], context: ExtractionContext): Promise<ExtractedFields>
}
// Implementation: OpenAiExtractionAdapter uses OPENAI_API_KEY env var

// src/lib/adapters/email.ts
interface EmailAdapter {
  send(options: SendEmailOptions): Promise<{ messageId: string }>
  isDryRun: boolean  // true when RESEND_API_KEY not configured
}
// Implementation: ResendEmailAdapter uses RESEND_API_KEY env var
// When key not present: logs to console, creates comms_log entry with status='draft'

// src/lib/adapters/pdf.ts
interface PdfGenerationAdapter {
  generatePdf(html: string, options: PdfOptions): Promise<Buffer>
}
// Implementation: PlaywrightPdfAdapter (server-side, uses PLAYWRIGHT_EXECUTABLE_PATH)

// src/lib/adapters/payment.ts
interface PaymentAdapter {
  createCheckoutSession(options: CheckoutOptions): Promise<{ url: string }>
  createSubscription(options: SubscriptionOptions): Promise<{ subscriptionId: string }>
  handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent>
}
// Implementation: StripeAdapter uses STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET env vars

// src/lib/adapters/transcription.ts
interface TranscriptionAdapter {
  transcribe(audioBuffer: Buffer, options: TranscriptionOptions): Promise<{ text: string, duration: number }>
}
// Implementation: OpenAiWhisperAdapter uses OPENAI_API_KEY env var

// src/lib/adapters/storage.ts
interface StorageAdapter {
  upload(bucket: string, path: string, buffer: Buffer, contentType: string): Promise<string>
  getSignedUrl(bucket: string, path: string, expiresIn: number): Promise<string>
  delete(bucket: string, path: string): Promise<void>
}
// Implementation: SupabaseStorageAdapter (always configured)
```

---

## PART 17 — SIMPLIFIED UI PRINCIPLES

The UI must feel like a professional tool, not a form-filler. These rules apply everywhere:

1. **One primary action per screen** — the most important thing the assessor needs to do next is always visually dominant
2. **Status tells a story** — case status is always visible, always accurate, always explains what needs to happen
3. **Never ask for information you already have** — if the client is set, pre-fill insurer name from client record. If mandate is selected, pre-fill required evidence list.
4. **Surfaced errors, not buried errors** — missing mandate items appear at the top of the case, not inside a tab
5. **Fast evidence capture** — the Capture tab and mobile capture screen open the camera in max 2 taps from the case
6. **Drag-and-drop everywhere documents can appear** — instruction, quotes, valuation printout, statements
7. **AI assist is offered, never forced** — "Draft this section with AI?" is a button, not automatic
8. **Reports look like reports** — the report preview pane shows real A4 formatting, not a markdown textarea
9. **The pack builder is visual** — show what's in the pack as document card thumbnails, not a list of checkboxes
10. **Mobile-first for capture, desktop-first for reporting** — the mobile app is for field work; the web app is for desk work. Don't try to make both do everything.

---

## PART 18 — STAGE-BY-STAGE EXECUTION ORDER

Build in this order. Do not skip stages. The comms trigger system is core MVP — it ships in Stage 2 alongside OCR, not after.

### Stage 1 — Schema migration and core data model
- Run all migrations in Part 4
- Apply RLS from Part 15
- Add `generate_case_number()` SQL function
- Remove all SA-specific hardcoding from existing schema
- Add `billing_mode`, `monthly_pack_count`, `monthly_pack_limit`, `billing_period_start` columns to `organisations`
- Add `VERTICAL_CONFIGS` static config object (Part 2) — this gates all subsequent vertical-aware work

### Stage 2 — Onboarding, vertical shell, client management, and comms foundation
*(These four things ship together. They are mutually dependent.)*
- Build onboarding wizard (Part 5)
  - Professional type selection drives `VERTICAL_CONFIGS` lookup immediately
  - Step 3 (first client) seeds default mandate + comms templates for that client
- Build vertical-driven 5-tab case workspace (Part 8) using `VERTICAL_CONFIGS`
  - Accordion sections within tabs, data-driven from config object
  - No hardcoded vertical checks in components
- Build client management with rate structures, rules, and mandate library (Part 14)
- Build mandate builder with requirement groups (Part 14)
- Build smart comms trigger system (Part 6) — **this is core MVP, not optional**
  - `checkCommsTrigger()` function wired to all mutation events
  - Comms slide-up prompt UI
  - Email preview side panel (editable before send)
  - All sends dry-run until `RESEND_API_KEY` is configured — logged as `status: 'draft'`
  - Default template seeds per vertical on org creation

### Stage 3 — OCR intake pipeline
- Implement all adapters with dry-run fallbacks (Part 16)
- Build `POST /api/intake/process` pipeline (Part 7)
- Wire all document drop zones to real pipeline
- Wire valuation printout extraction into `vehicle_values`
- Wire `document_drop_*` events to comms trigger system (already built in Stage 2)

### Stage 4 — Billing (both modes)
- Implement Stripe adapter (Part 16)
- Build credit purchase flow (Stripe Checkout)
- Build subscription signup flow (Stripe Checkout + Billing)
- Build billing settings page with mode toggle
- Build webhook handler for all events
- Wire pack generation to `checkAndDeductPackCredit()` gate
- Seed 3 free credits on org creation

### Stage 5 — Reporting simplification and server-side PDF
- Redesign case workspace reporting tab (Part 8)
- Build AI-assisted report section drafting
- Build live report preview pane
- Implement Playwright PDF generation (Part 13)
- Implement photo evidence PDF generation
- Implement ZIP pack generation
- Wire pack generation to billing gate (Stage 4)

### Stage 6 — Platform event instrumentation
- Add `trackEvent()` after every action (Part 11)
- Verify admin analytics dashboard receives real data
- No new features ship without event instrumentation from this stage forward

### Stage 7 — Mobile upload queue migration
- Replace AsyncStorage with expo-sqlite (Part 10)
- Implement background fetch
- Build retry UI in mobile app

### Stage 8 — Polish, testing, and international validation
- Add vitest unit tests: calculator, field extraction, case number generation, `checkCommsTrigger()`
- Add integration tests for OCR pipeline and billing gate
- Test all verticals end-to-end with sample documents
- Test non-ZAR currency (USD, GBP) — verify no symbol hardcoding anywhere
- Test subscription overage auto-top-up flow

---

## PART 19 — ENVIRONMENT VARIABLES REQUIRED

All keys are configured here. Add them when available:

```env
# Supabase (required — always configured)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Cloud Vision (OCR)
GOOGLE_CLOUD_VISION_CREDENTIALS=   # JSON string of service account key

# OpenAI (field extraction + transcription)
OPENAI_API_KEY=

# Resend (email sending)
RESEND_API_KEY=
RESEND_FROM_NAME=Refrag
RESEND_FROM_EMAIL=notifications@refrag.app

# Stripe (billing)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CREDIT_PRICE_ID_5=        # 5 credits
STRIPE_CREDIT_PRICE_ID_20=       # 20 credits
STRIPE_CREDIT_PRICE_ID_50=       # 50 credits

# Playwright (PDF generation — server only)
PLAYWRIGHT_EXECUTABLE_PATH=      # optional, defaults to bundled

# App
NEXT_PUBLIC_APP_URL=
```

---

## PART 20 — THINGS THAT MUST NEVER BE IN THE CODEBASE

These are hard rules that must be caught in code review:

1. **No `R` (currency symbol) hardcoded anywhere** — use `Intl.NumberFormat` with org currency
2. **No "POPIA" hardcoded** — use `org.data_protection_regime`
3. **No "mm_code" as a column name on risk_items** — use `identifier_type` + `identifier_value`
4. **No `AsyncStorage` in the upload queue** — must be SQLite
5. **No client-side case number generation** — server-side only
6. **No browser `window.print()`** for report generation in production — Playwright only
7. **No external API called inline** — must go through adapter module
8. **No PII sent to AI** — must pass through PII-stripping before any OpenAI call
9. **No `platform_events` reads outside the admin suite** — telemetry is write-only from client apps
10. **No hardcoded pricing or currency amounts** — all from Stripe config or org settings
11. **No `if (vertical === 'motor') { ... }` checks scattered through components** — all vertical differences must flow from `VERTICAL_CONFIGS[case.vertical]`. One config object, no inline branching.
12. **No separate navigation structure per vertical** — the 5-tab shell is universal. Vertical config drives accordion sections within tabs, not the tabs themselves.
13. **No pack generation without running `checkAndDeductPackCredit()` first** — the billing gate is mandatory, not optional, regardless of billing mode.
14. **No comms send without a `comms_log` entry** — every send (triggered or manual) and every dismiss must be logged with `trigger_event` recorded.
15. **No report section auto-accepted from AI** — assessor must explicitly click "Accept draft" or edit before content is saved. AI drafts are always shown in a pending state first.

---

*End of master prompt. When starting a new build session, paste this entire document and specify which Stage from Part 18 to begin.*
