# Refrag - Phased Build Plan

## Overview

This document outlines a phased approach to building the Refrag professional workflow OS for assessors/inspectors. The plan prioritizes the **Mobile App (Field Capture)** first, followed by the **Web App**, and finally the **Admin Suite**.

---

## Phase 1: Foundation & Infrastructure Setup

**Goal:** Establish core database schema, authentication, and project scaffolding.

### 1.1 Database Schema & Types
- [ ] Create all enum types (case status, priority, evidence types, etc.)
- [ ] Create all 17 core tables with proper relationships
- [ ] Add indexes for performance (org_id, case_id, user_id, etc.)
- [ ] Set up foreign key constraints
- [ ] Create helper functions: `is_org_member(org_id)`, `is_org_admin(org_id)`
- [ ] **Deliverable:** Complete SQL migration file with schema

### 1.2 Row Level Security (RLS)
- [ ] Enable RLS on all tables
- [ ] Create RLS policies for SELECT/INSERT/UPDATE/DELETE
- [ ] Implement org-scoped access control
- [ ] Test RLS policies with different user roles
- [ ] **Deliverable:** SQL policies file ready for Supabase

### 1.3 Supabase Project Setup
- [ ] Create Supabase project
- [ ] Configure authentication (email/password)
- [ ] Set up storage bucket: `evidence`
- [ ] Configure storage policies
- [ ] Test basic auth flow
- [ ] **Deliverable:** Configured Supabase project

### 1.4 Project Repositories Setup
- [ ] Initialize mobile app repository (Expo React Native)
- [ ] Initialize web app repository (Next.js)
- [ ] Initialize admin suite repository (Next.js) or monorepo structure
- [ ] Set up TypeScript configs
- [ ] Configure ESLint/Prettier
- [ ] **Deliverable:** Three project repositories ready

---

## Phase 2: Mobile App - Core Foundation (Weeks 1-2)

**Goal:** Build the mobile field capture app foundation with auth and basic navigation.

### 2.1 Mobile App Project Setup
- [ ] Initialize Expo React Native project with TypeScript
- [ ] Set up expo-router for navigation
- [ ] Configure theme tokens (colors, typography)
- [ ] Set up folder structure (app/, src/lib, src/components, src/features, src/store, src/db)
- [ ] Install dependencies (Supabase, React Query, Zod, Zustand)
- [ ] **Deliverable:** Mobile app scaffold with navigation

### 2.2 Supabase Client & Auth
- [ ] Create Supabase client for React Native
- [ ] Implement SecureStore for session storage
- [ ] Build auth hooks and providers
- [ ] Create login screen (`/(auth)/login`)
- [ ] Implement logout functionality
- [ ] **Deliverable:** Working auth flow

### 2.3 Organisation Selection
- [ ] Fetch user's org memberships on login
- [ ] Create org-select screen (`/(app)/org-select`)
- [ ] Store selected org_id in secure storage
- [ ] Implement org context/provider
- [ ] Add route protection (redirect if no org selected)
- [ ] **Deliverable:** Multi-org support with selection

### 2.4 Basic Case Management (Mobile)
- [ ] Create cases list screen (`/(app)/cases`)
- [ ] Implement case fetching with org_id scoping
- [ ] Add search functionality (case_number, client_name, claim_reference)
- [ ] Create "New Case" FAB and modal
- [ ] Implement case creation with auto-generated case_number
- [ ] Create case detail screen (`/(app)/cases/[id]`)
- [ ] Add status update dropdown
- [ ] Implement audit logging for case actions
- [ ] **Deliverable:** Basic case CRUD on mobile

---

## Phase 3: Mobile App - Evidence Capture (Weeks 3-4)

**Goal:** Enable offline-first evidence capture with tagging and upload queue.

### 3.1 Evidence Capture UI
- [ ] Create evidence list screen (`/(app)/cases/[id]/evidence`)
- [ ] Implement thumbnail grid/list view
- [ ] Add capture buttons (photo, video, gallery, document)
- [ ] Integrate expo-camera, expo-image-picker, expo-document-picker
- [ ] Create evidence detail view with notes and tags
- [ ] **Deliverable:** Evidence capture interface

### 3.2 Evidence Tagging
- [ ] Create tagging UI (multi-select + free text)
- [ ] Implement suggested tags list (VIN, ODOMETER, FRONT, etc.)
- [ ] Add tag filtering on evidence list
- [ ] Store tags in evidence_tags table
- [ ] **Deliverable:** Tagging system

### 3.3 Local Storage & Offline Queue
- [ ] Set up SQLite or MMKV for local persistence
- [ ] Create upload queue data structure
- [ ] Implement queue store (Zustand) with status tracking
- [ ] Add queue item model (pending, uploading, failed, complete)
- [ ] **Deliverable:** Offline queue infrastructure

### 3.4 Upload Queue Processor
- [ ] Implement connectivity monitoring (expo-network/NetInfo)
- [ ] Create queue worker with retry logic (exponential backoff)
- [ ] Implement Supabase Storage upload with signed URLs
- [ ] Handle upload success/failure states
- [ ] Create queue status UI (badge count, retry button)
- [ ] Add audit logging for uploads
- [ ] **Deliverable:** Working offline-first upload system

### 3.5 Evidence Management Features
- [ ] Implement signed URL retrieval for viewing
- [ ] Add delete evidence functionality with confirmation
- [ ] Create evidence notes editor
- [ ] Add captured_at timestamp handling
- [ ] **Deliverable:** Complete evidence management

---

## Phase 4: Mobile App - Mandates & Notes (Week 5)

**Goal:** Complete mobile app core features with mandate checklist and notes.

### 4.1 Mandate Management (Mobile)
- [ ] Create mandate selection UI (`/(app)/cases/[id]/mandate`)
- [ ] Implement mandate fetching and selection
- [ ] Auto-create requirement_checks when mandate assigned
- [ ] Create checklist display (grouped by evidence_type)
- [ ] Show status indicators (missing/provided/not_applicable)
- [ ] **Deliverable:** Mandate selection and checklist

### 4.2 Requirement Evidence Linking
- [ ] Implement "Attach evidence" functionality
- [ ] Create evidence picker filtered by media_type
- [ ] Link evidence to requirements
- [ ] Update requirement_checks status
- [ ] Add "Missing Requirements" prompt card
- [ ] **Deliverable:** Evidence linking to requirements

### 4.3 Case Notes & Comms Log
- [ ] Create case notes UI in case detail overview
- [ ] Implement case_notes CRUD
- [ ] Add comms log entry UI (channel='note')
- [ ] Create simple note-taking interface
- [ ] **Deliverable:** Notes and comms logging

### 4.4 Mobile App Polish
- [ ] Add error boundaries and global error handling
- [ ] Implement loading skeletons
- [ ] Create empty states (no cases, no evidence, etc.)
- [ ] Add toast notifications
- [ ] Optimize FlatList performance
- [ ] Implement thumbnail caching
- [ ] Add basic analytics events (local)
- [ ] **Deliverable:** Polished mobile app MVP

---

## Phase 5: Web App - Foundation & Case Management (Weeks 6-7)

**Goal:** Build web app foundation and core case management features.

### 5.1 Web App Project Setup
- [ ] Initialize Next.js App Router project with TypeScript
- [ ] Set up Tailwind CSS and shadcn/ui
- [ ] Configure Supabase client (server + browser)
- [ ] Set up Zod for validation
- [ ] Create folder structure
- [ ] Configure theme (colors, typography)
- [ ] **Deliverable:** Web app scaffold

### 5.2 Web App Authentication & Layout
- [ ] Create login page (`/login`)
- [ ] Implement middleware for route protection
- [ ] Create app layout with left nav + top bar
- [ ] Set up protected routes (`/app/*`)
- [ ] Implement logout
- [ ] **Deliverable:** Auth flow and basic layout

### 5.3 Case Management (Web)
- [ ] Create dashboard (`/app/dashboard`) with cases list
- [ ] Implement case search and filtering
- [ ] Create "New Case" modal with form
- [ ] Build case detail page (`/app/cases/[id]`)
- [ ] Add case overview tab with edit form
- [ ] Implement status and priority updates
- [ ] Add case contacts management
- [ ] **Deliverable:** Complete case management on web

---

## Phase 6: Web App - Evidence & Mandates (Week 8)

**Goal:** Implement evidence management and mandate features on web.

### 6.1 Evidence Management (Web)
- [ ] Create evidence tab (`/app/cases/[id]/evidence`)
- [ ] Implement drag & drop upload area
- [ ] Add file upload to Supabase Storage
- [ ] Create evidence grid/list view with thumbnails
- [ ] Implement tagging interface
- [ ] Add evidence notes editor
- [ ] Create signed URL viewing
- [ ] Add delete functionality
- [ ] **Deliverable:** Web evidence management

### 6.2 Mandate Management (Web)
- [ ] Create settings page (`/app/settings/mandates`)
- [ ] Implement mandate CRUD
- [ ] Create mandate_requirements CRUD with ordering
- [ ] Build mandate tab (`/app/cases/[id]/mandate`)
- [ ] Implement mandate selection for cases
- [ ] Create requirement checklist UI
- [ ] Add evidence linking to requirements
- [ ] Show completeness summary
- [ ] **Deliverable:** Complete mandate system

---

## Phase 7: Web App - Assessment Report Engine & Communications (Weeks 9–10)

**Goal:** Build a full-featured, domain-aware assessment report engine for motor and property claims, with OCR-powered document ingestion, structured data capture, a financial calculator, and a polished report builder. Lay communications infrastructure alongside.

---

### Background & Domain Context

The assessment report is the primary deliverable an assessor produces. It must support all real-world claim outcomes:

| Outcome | Description |
|---|---|
| **Repairable** | Repair cost is economical. Has repair quote, parts quote, betterment deductions. |
| **Uneconomical to Repair (Write-off / Code 2)** | Assessed repair cost exceeds the Max Repair Value (typically 75–80% of Retail/Market value). Settlement = vehicle value less excess and salvage. |
| **Theft Total Loss** | Vehicle stolen and unrecovered. Settlement based on insured/market value. |
| **Partial Theft / Stripped** | Components stolen; vehicle remains. Partial repair claim. |
| **Rejection** | Claim rejected. Reasons: no cover, exclusion, misrepresentation, fraud indicators. |
| **Further Investigation Required** | Suspicious elements; referred for SIU / forensic investigation. |

> **MVP Note:** Vehicle market values (M&M / eValue8 / TransUnion) are ingested via drag-and-drop OCR of the printed valuation guide page — no live API in Phase 7. Repairer and parts quotations are similarly OCR-ingested from scanned estimates.

---

### 7.1 Assessment Schema Extensions (Database)

- [ ] Create `motor_assessments` table:
  - `id`, `case_id` (FK), `org_id`, `status` (draft/ready/submitted), `created_by`, timestamps
  - `assessment_sequence` enum (initial/supplementary/re_inspection) — supports supplementary assessments when hidden damage is found during repair
  - `parent_assessment_id` (nullable FK to self) — links supplementary to its initial; carries forward data
  - `sequence_number` (integer, default 1) — auto-incremented per case
  - Assessment instruction fields: `insurer_name`, `insurer_email`, `claim_number`, `date_of_loss`, `claims_technician`, `assessor_name`, `assessor_contact`, `date_assessed`, `assessment_location`, `assessment_type` (Physical/Digital/Desktop), `vehicle_stripped` (boolean)
  - Client fields: `insured_name`, `insured_contact`, `policy_number`
  - Assessment outcome: `outcome` enum (repairable/write_off/theft_total/partial_theft/rejected/further_investigation), `outcome_notes`

  > **Multi-vehicle note:** The schema deliberately allows multiple `motor_assessments` rows per `case_id`. Multi-vehicle claims are supported by creating one assessment per vehicle on the same case.

- [ ] Create `vehicle_details` table (linked to motor_assessments):
  - `make`, `model`, `year_model`, `reg_number`, `vin_number`, `engine_number`, `mileage`, `mm_code`
  - `transmission` (manual/automatic), `colour`
  - Condition fields: `windscreen` (intact/cracked/damaged), `wheels` (factory/alloy/aftermarket), `spare_wheel` (present/missing/unknown), `air_conditioning` (factory/aftermarket/none), `radio` (factory/aftermarket/none), `brakes` (good/fair/worn/unknown)
  - `vehicle_notes` (free text)
  - Damage direction: `damage_direction` (front/rear/left/right/rollover/multiple/underbody), `damage_description`

- [ ] Create `tyre_details` table (4 rows per assessment: RF/LF/RR/LR):
  - `assessment_id`, `position` (RF/LF/RR/LR), `make`, `size`, `tread_mm`, `condition` (good/worn/damaged/unknown), `comments`

- [ ] Create `pre_existing_damages` table:
  - `assessment_id`, `location`, `description`, `severity` (minor/moderate/severe), `photo_evidence_id` (FK to evidence)

- [ ] Create `vehicle_values` table (one row per assessment):
  - `assessment_id`, `source` (MM_Guide/eValue8/Other), `valuation_date`
  - `new_price_value`, `retail_value`, `trade_value`, `market_value`
  - `extras_value`, `less_old_damages`, `vehicle_total_value`
  - `max_repair_percentage` (default 75.00), `max_repair_value` (computed or manual override)
  - `salvage_value` (for write-offs)

- [ ] Create `repair_assessments` table:
  - `assessment_id`, `repairer_name`, `repairer_contact`, `repairer_email`, `approved_repairer` (boolean)
  - `quoted_amount`, `assessed_repair_total_excl_vat`, `betterment_incl_vat`
  - `is_uneconomical` (boolean, auto-flagged when assessed total > max repair value)

- [ ] Create `repair_line_items` table:
  - `assessment_id`, `description`, `qty`
  - `operation_type` enum (panel/mechanical/electrical/paint/structural/trim/glass/other) — categorises the operation for rate lookup
  - `parts_cost`
  - `labour_hours`, `labour_rate`, `labour_cost` (computed: hours × rate; rate defaults from org settings per operation_type)
  - `paint_cost`, `paint_materials_cost`
  - `strip_assm_cost`, `frame_cost`, `misc_cost`
  - `is_sublet` (boolean) — flags operations sub-let to specialist workshops (windscreen, electronics, wheel alignment, airbag, etc.)
  - `sublet_supplier` (text, nullable) — name of sub-let specialist
  - `is_approved` (boolean), `notes`
  - `betterment_applicable` (boolean), `betterment_percentage` (decimal, nullable)

- [ ] Create `parts_assessments` table:
  - `assessment_id`, `supplier_name`, `supplier_contact`, `supplier_email`, `notes_on_parts`
  - `parts_amount_excl_vat`, `parts_handling_fee_excl_vat`

- [ ] Create `claim_financials` table (computed summary):
  - `assessment_id`, `total_excl_vat`, `vat_amount`, `total_incl_vat`, `less_excess`, `grand_total`
  - Write-off fields: `settlement_value`, `less_salvage`, `net_settlement`

- [ ] Create `assessment_documents` table (OCR ingestion tracking):
  - `assessment_id`, `evidence_id` (FK), `document_type` (assessment_report/mm_valuation/repair_estimate/parts_quote/other), `ocr_status` (pending/processing/complete/failed), `raw_ocr_text`, `extracted_fields` (JSONB), `confidence_score`, `reviewed_by`, `reviewed_at`

- [ ] Create `report_evidence_links` table (photos embedded in report):
  - `assessment_id`, `evidence_id` (FK), `report_section` (text — e.g. 'vehicle_details', 'damage', 'findings'), `display_order`, `caption`
  - Allows specific evidence photos to be attached to specific report sections for inline rendering

- [ ] Add new enum types: `assessment_outcome`, `assessment_sequence`, `assessment_type`, `damage_direction`, `tyre_position`, `doc_type_ocr`, `operation_type`
- [ ] Add RLS policies for all new tables (org-scoped, assessor access)
- [ ] Add indexes on `assessment_id`, `case_id`, `org_id`
- [ ] **Deliverable:** Complete assessment schema migration

---

### 7.2 OCR Document Ingestion Module

> This module powers the drag-and-drop workflow for reading M&M valuation printouts, repairer estimates, and parts quotations instead of a live data API.

- [ ] Create OCR ingestion UI within the case's Assessment tab:
  - Drop zones labelled by document type: "M&M / eValue8 Valuation", "Repair Estimate", "Parts Quotation", "Assessment Report"
  - Support PDF and image uploads (JPG/PNG/HEIC)
  - Show upload progress and OCR processing state (queued → reading → extracting → review)

- [ ] Integrate **Google Cloud Vision API** (Document AI or Vision Text Detection):
  - Create server-side API route `/api/ocr/extract` that accepts a file and document type
  - Call `documents:process` or `images:annotate` with `DOCUMENT_TEXT_DETECTION` feature
  - Store raw OCR response text in `assessment_documents.raw_ocr_text`

- [ ] Build **field extraction parser** per document type:
  - `mm_valuation` parser: extract New Price, Retail, Trade, Market values; M&M code, make, model, year, print date
  - `repair_estimate` parser: extract repairer name/contact, line items (description, parts, labour, paint, strip/assm, frame, misc), totals, DR number
  - `parts_quote` parser: extract supplier name/contact, line items, amounts
  - Use pattern matching + LLM-assisted extraction for unstructured layouts
  - Store extracted key-value pairs in `assessment_documents.extracted_fields` (JSONB)

- [ ] Build **OCR Review & Confirmation UI**:
  - Side-by-side view: extracted field form on the left, document image on the right
  - Each extracted field shows the value with a confidence indicator (green/amber/red)
  - Low-confidence fields are highlighted for manual review
  - User can correct any field before confirming
  - "Confirm & Apply to Assessment" button maps approved fields into the assessment record
  - Show which fields were auto-populated vs manually entered

- [ ] Handle multi-page PDFs: extract all pages, stitch text, parse as single document
- [ ] Add re-upload / re-process button if extraction fails
- [ ] Log all OCR extractions in `assessment_documents` with `reviewed_by` and `reviewed_at`
- [ ] **Deliverable:** Working OCR ingestion for M&M valuations, repair estimates, parts quotes

---

### 7.3 Vehicle Assessment Input Module

> Structured data entry for all sections of the assessment. Mirrors the domain sections of a professional assessment report.

- [ ] Create `/app/cases/[id]/assessment` page with tabbed sub-sections
- [ ] **Tab: Instruction & Parties**
  - Assessment type selector (Physical / Digital / Desktop)
  - Insurer / Broker: name, email
  - Claim number, Date of Loss, Claims Technician
  - Assessor name (auto-populated from user profile), contact
  - Date assessed (default today), Assessment location
  - Was the vehicle stripped? (toggle)
  - Client / Insured: name, contact, policy number

- [ ] **Tab: Vehicle Details**
  - Make / Model / Year (searchable dropdowns or free text)
  - Registration number, VIN, Engine number
  - Mileage (with "Unknown" toggle)
  - M&M Code
  - Transmission, Colour
  - Condition fields: Windscreen, Wheels, Spare Wheel, A/C, Radio, Brakes (all dropdowns)
  - Notes on vehicle (free text)

- [ ] **Tab: Damage & Tyres**
  - Damage direction selector: interactive vehicle silhouette diagram (clickable zones: Front / Rear / Left-side / Right-side / Underbody / Rollover / Multiple) — SVG component
  - Damage description (free text)
  - Tyre details table: 4 rows (RF/LF/RR/LR) with Make, Size, Tread (mm), Condition columns
  - Tyre comments field
  - Pre-existing / old damages list: add rows with Location, Description, Severity; link to evidence photos

- [ ] **Tab: Vehicle Values** (auto-populated from OCR, editable)
  - New Price, Retail, Trade, Market values
  - Extras value, Less Old Damages
  - Vehicle Total Value (auto-calculated)
  - Max Repair Value % (default 75%, editable per org settings)
  - Max Repair Value (auto-calculated: Retail × %)
  - Salvage value (for write-offs)
  - Source label and Valuation Date

- [ ] **Tab: Repair Assessment** (auto-populated from OCR, editable)
  - Repairer name, contact, email, Approved Repairer toggle (selectable from org's approved repairers list)
  - Quoted Amount (from estimate)
  - Line items grid: editable table pulled from OCR:
    - Description, Operation Type (panel/mechanical/electrical/paint/structural/trim/glass/other)
    - Qty, Parts Cost
    - Labour Hours, Labour Rate (auto-populated from org default per operation type), Labour Cost (computed)
    - Paint Cost, Paint Materials
    - Strip/Assm Cost, Frame Cost, Misc Cost
    - Sub-let toggle (flags windscreen, electronics, wheel alignment, airbag etc. sub-let to specialists) + Sub-let Supplier name
    - Betterment applicable toggle + Betterment % per line item
    - Approved toggle
  - Add / remove line items manually
  - Assessed Repair Total excl VAT (sum of approved line items)
  - Betterment total incl VAT (sum of per-line betterment deductions)
  - Auto-flag banner: "⚠ Assessed total exceeds Max Repair Value — consider write-off" when applicable

- [ ] **Tab: Parts Assessment** (auto-populated from OCR, editable)
  - Parts supplier name, contact, email
  - Notes on parts (OEM vs aftermarket, availability, notes)
  - Parts line items: Part number, Description, Qty, Unit price, Total
  - Parts Amount Total excl VAT
  - Parts Handling Fee excl VAT (configurable % or manual)

- [ ] **Tab: Claim Outcome & Financials**
  - Outcome selector (Repairable / Write-off / Theft Total / Partial Theft / Rejected / Further Investigation)
  - Conditional UI based on outcome:
    - Repairable: shows repair + parts summary, betterment, total calc
    - Write-off: shows vehicle value, salvage, settlement calculator
    - Rejected: reason code dropdown + narrative
    - Further Investigation: referral notes and flagged indicators
  - Financial summary table (auto-calculated, overridable):
    - Total (Excl VAT), VAT @ 15%, Total (Incl VAT), Less Excess (T.B.A or value), Grand Total
  - Excess amount field (editable, can mark as TBA)

- [ ] **Tab: Assessor Findings**
  - Narrative: "Does the damage correspond with the accident description?" (Y/N + notes)
  - Fraud indicators checklist (configurable per org):
    - Odometer discrepancy
    - VIN/Reg inconsistencies
    - Pre-existing damage presented as new
    - Damage inconsistent with described incident
    - Multiple claims on same vehicle
    - Staged accident indicators
    - Identity / policy fraud indicators
  - General findings narrative (rich text)
  - Recommendation (free text)
  - Notes to Claims Technician (multi-line, styled prominently — shown at bottom of report)

- [ ] **Supplementary Assessment Support**
  - "Create Supplementary" button on a submitted assessment — creates a new assessment with `assessment_sequence = supplementary`, `parent_assessment_id` pointing to the original
  - Data carried forward from initial assessment (vehicle details, values, parties) — only repair/parts sections start fresh
  - "Re-inspection" option for post-repair quality checks
  - Assessment list on case page shows all assessments with sequence labels (Initial, Supplementary #2, Re-inspection #3)
  - Supplementary assessment report includes delta summary: "Additional items found during strip"

- [ ] **Case Navigation Integration**
  - Add "Assessment" tab to case detail page navigation bar (`/app/cases/[id]`)
  - Deprecate old "Report" tab — redirect `/app/cases/[id]/report` to `/app/cases/[id]/assessment/report`
  - Show assessment count badge on tab when multiple assessments exist
  - Assessment list view when multiple assessments on one case (selectable)

- [ ] **Evidence Photo Linking for Report**
  - Within each assessment input tab, add "Attach Photos to Report" action
  - Opens evidence picker filtered to case's photos
  - Selected photos are linked to the active report section via `report_evidence_links` table
  - Set display order and optional caption per photo
  - Photos appear inline in the report preview within the relevant section

- [ ] Auto-save all tabs as draft on change (debounced)
- [ ] Show section completion status in tab headers (complete / incomplete / not applicable)
- [ ] **Deliverable:** Full structured assessment data entry across all tabs, with supplementary assessment support, case navigation, and evidence photo linking

---

### 7.4 Financial Calculator Engine

- [ ] Build server-side calculation service `assessmentCalculator`:
  - `computeMaxRepairValue(retailValue, percentage)` → max repair value
  - `computeRepairTotal(lineItems)` → sum approved line items across all cost types
  - `computePartsTotal(partsLineItems)` → parts + handling fee
  - `computeIsUneconomical(repairTotal, maxRepairValue)` → boolean + threshold info
  - `computeClaimTotal(repairTotal, partsTotal, betterment)` → total excl VAT
  - `applyVAT(amount, rate=0.15)` → VAT and inclusive total
  - `computeGrandTotal(inclusiveTotal, excess)` → grand total
  - `computeWriteOffSettlement(vehicleTotalValue, salvageValue, excess)` → net settlement
  - `computeBetterment(partsCost, ageMonths, mileage, wearTable)` → betterment deduction

- [ ] Apply betterment logic:
  - Betterment applies when a worn part is replaced with new (e.g. tyres, battery, exhaust)
  - Percentage applied based on part age and mileage (configurable wear table per org)
  - UI shows per-line-item betterment flag and percentage

- [ ] Persist calculated values to `claim_financials` table on save
- [ ] All calculations are re-run on save; manual overrides are flagged with an "Override" badge
- [ ] **Deliverable:** Accurate automated financial calculations with betterment support

---

### 7.5 Assessment Report Builder & Preview

> The report builder generates a professional, printable/exportable assessment report from the structured data entered in 7.3. This is the primary output document.

- [ ] Create report preview page (`/app/cases/[id]/assessment/report`):
  - Renders live HTML preview of the report using the saved assessment data
  - Uses the org's branding (logo, company reg, VAT number, contact details from org settings)
  - "Without Prejudice" banner (configurable toggle)

- [ ] Report sections (rendered in order, shown/hidden based on relevance):
  1. **Header** — Org logo, company registration, VAT number, assessor contact details
  2. **Report Title** — "Assessment Report: Without Prejudice" (or "Supplementary Assessment Report" / "Re-inspection Report" based on sequence)
  3. **Client Details** — Insured name, contact, policy number
  4. **Assessment Instruction** — Insurance/Broker, claim number, date of loss, claims technician | Assessor name, contact, date assessed, location, assessment type, vehicle stripped
  5. **Vehicle Details** — Full vehicle details table (make, model, year, reg, VIN, engine, mileage, M&M code, transmission, colour, windscreen, wheels, spare wheel, A/C, radio, brakes) + linked evidence photos
  6. **Notes on Vehicle** — (if populated)
  7. **Damage Direction** — Vehicle silhouette diagram with damage zones highlighted + description + linked damage photos rendered inline
  8. **Tyre Condition** — 4-tyre table with make, size, tread, condition
  9. **Pre-existing / Old Damages** — List with location, description, severity + linked evidence photos
  10. **Vehicle Values** — New/Retail/Trade/Market values, Extras, Vehicle Total, Max Repair Value
  11. **Repair Assessment** *(repairable/write-off outcomes)* — Repairer details, quoted amount, assessed total, betterment; labour rate breakdown per operation type
  12. **Repair Line Items** *(optional detailed breakdown)* — Line items table with labour hours × rate, sub-let items flagged
  13. **Parts Assessment** *(repairable outcomes)* — Supplier details, parts total, handling fee
  14. **Total Cost of Claim** — Summary financial table with VAT and excess
  15. **Write-off / Settlement Summary** *(write-off/theft outcomes)* — Vehicle value, salvage, net settlement
  16. **Supplementary Assessment Delta** *(supplementary only)* — Summary of additional items found since initial assessment, with reference to parent assessment
  17. **Outcome Declaration** — Clear statement of assessed outcome (Repairable / Write-off / etc.)
  18. **Assessor Findings** — Fraud indicator summary, damage correlation, narrative + linked evidence photos
  19. **Final Notes to Claims Technician** — Prominently displayed notes block
  20. **Footer** — Assessor signature block, date, disclaimer text

- [ ] Report status workflow: `draft` → `ready` → `submitted`
  - "Mark Ready" validates completeness (required fields, financials calculated, outcome set)
  - "Submit" locks the report from further editing (with unlock override for admins)
  - All status changes logged in audit trail

- [ ] Report versioning: each "Mark Ready" creates an immutable version snapshot stored in `report_versions` table

- [ ] Add section visibility toggles in report settings (e.g. hide line items, hide tyre details if not relevant)
- [ ] "Edit Section" inline buttons navigate back to the relevant input tab
- [ ] **Deliverable:** Live report preview with full section coverage and status workflow

---

### 7.6 Org Assessment Settings

- [ ] Create `/app/settings/assessment` settings page:
  - **Org Branding & Report**
    - Org logo upload (image file → Supabase Storage → referenced in report header)
    - Company registration number, VAT registration number (displayed on reports)
    - Report disclaimer footer text (editable rich text)
    - "Without Prejudice" banner on/off default
  - **Financial Defaults**
    - Max Repair Value default percentage (e.g. 75%)
    - VAT rate (default 15%, configurable)
    - Parts handling fee default percentage
  - **Labour Rates** (per operation type)
    - Panel rate (R/hour), Mechanical rate, Electrical rate, Paint rate, Structural/Frame rate, Trim rate, Glass rate
    - These default into `repair_line_items.labour_rate` based on the line item's `operation_type`
  - **Betterment**
    - Betterment wear table (part type → depreciation curve based on age/mileage)
  - **Assessment Configuration**
    - Assessment types available (Physical/Digital/Desktop)
    - Fraud indicator checklist items (add/remove/reorder)
  - **Approved Panels**
    - Approved repairers list (name, contact, email — selectable in assessment repair tab)
    - Preferred parts suppliers list (name, contact, email — selectable in parts tab)
- [ ] **Deliverable:** Configurable assessment defaults per organisation, with org branding and labour rate tables

---

### 7.7 Communications

- [ ] Create `/app/settings/templates` page:
  - Comms template CRUD (name, subject, body)
  - Rich text editor for body
  - Placeholder support: `{{CaseNumber}}`, `{{ClientName}}`, `{{PolicyNumber}}`, `{{ClaimNumber}}`, `{{Outcome}}`, `{{AssessorName}}`, `{{DateAssessed}}`, `{{InsurerName}}`
  - Template categories: Acknowledgement / Assessment Complete / Write-off Notification / Repair Approved / Rejection / Request for Information

- [ ] Create comms tab (`/app/cases/[id]/comms`):
  - Comms log viewer (channel, direction, date, summary)
  - "New Communication" action: template selector → preview with placeholders resolved → send / log
  - Manual log entry (log a phone call, email sent externally, etc.)
  - Link comms entries to the case claim number and insurer email

- [ ] **Deliverable:** Communications template system and case comms log

---

### Phase 7 Summary — Deliverables

| Sub-phase | Deliverable |
|---|---|
| 7.1 | Complete assessment schema (11 new tables, 7 enums, RLS) — includes supplementary assessments, labour rates, report evidence links |
| 7.2 | OCR ingestion: drag-and-drop → Google Vision → field review |
| 7.3 | Full structured assessment input (7 tabs) + supplementary assessment flow + case navigation integration + evidence photo linking for report |
| 7.4 | Financial calculator with labour rate lookup, betterment, write-off/settlement logic |
| 7.5 | Live report preview with 20 sections (including supplementary delta), inline evidence photos, versioning, status workflow |
| 7.6 | Org-level settings: branding/logo upload, labour rates per operation type, betterment tables, approved panels |
| 7.7 | Communications templates and case comms log |

---

## Phase 8: Export & Assessor Pack Generation (Week 11)

**Goal:** Rebuild the PDF export system to render the new 20-section assessment report, including inline evidence photos, financial tables, and damage diagrams. Generate the complete Assessor Pack as a single PDF bundle.

> **Note:** Phase 8 was originally built against the old markdown report structure. It must be **rewritten** to render from the new Phase 7 assessment data model (motor_assessments, vehicle_details, repair_line_items, claim_financials, etc.)

### 8.1 PDF Generation Infrastructure (Rewrite)
- [ ] Choose PDF approach: Puppeteer (headless Chrome rendering the HTML report preview) **or** react-pdf/@react-pdf/renderer
  - Recommended: Puppeteer rendering the same HTML/CSS as the 7.5 report preview — ensures visual parity between screen and PDF
- [ ] Create PDF generation API route (`/api/export/generate-pdf`)
- [ ] Render the full 20-section assessment report to PDF:
  - All report sections from 7.5 (header, client, instruction, vehicle, damage diagram, tyres, values, repair with labour breakdown, parts, financials, outcome, findings, footer)
  - Inline evidence photos within sections (from `report_evidence_links`) — resized and positioned
  - Vehicle damage direction SVG rendered to image
  - Financial summary tables with proper formatting
  - Supplementary assessment delta section (if applicable)
  - Org branding: logo, company reg, VAT number from org settings
- [ ] Handle page breaks intelligently (avoid splitting tables/photos mid-row)
- [ ] **Deliverable:** PDF generation from new assessment data model

### 8.2 Assessor Pack Bundle
- [ ] Create Assessor Pack as a combined PDF containing:
  1. Assessment Report (the 20-section report)
  2. Valuation printout (the original scanned M&M/eValue8 document from OCR ingestion)
  3. Repair estimate (the original scanned repairer quote)
  4. Parts quotation (the original scanned parts quote)
  5. Evidence photo gallery (selected photos as appendix pages)
  6. Case metadata summary page
- [ ] Allow assessor to configure which attachments to include before export
- [ ] Merge PDFs using pdf-lib or similar
- [ ] **Deliverable:** Complete Assessor Pack PDF bundle

### 8.3 Export Functionality
- [ ] Refactor export tab (`/app/cases/[id]/export`)
  - Show assessment selector (when multiple assessments on a case)
  - Attachment selector checkboxes (report, valuation, estimate, parts quote, photos)
  - "Generate Assessor Pack" button with progress indicator
- [ ] Store generated PDF in Supabase Storage (bucket: `exports`)
- [ ] Download functionality with signed URLs
- [ ] Export history with version tracking (linked to assessment version)
- [ ] Audit logging for all exports
- [ ] **Deliverable:** Complete export system aligned with new assessment engine

---

## Phase 9: Admin Suite - Foundation (Weeks 11-12)

**Goal:** Build admin suite infrastructure and core management features.

### 9.1 Admin Database Schema
- [ ] Create staff_users table
- [ ] Extend organisations table (status, plan, billing fields)
- [ ] Create platform_events table
- [ ] Create admin_audit_log table
- [ ] Create data_access_log table
- [ ] Create background_jobs table (optional)
- [ ] Add helper functions: `is_staff()`, `staff_role()`
- [ ] **Deliverable:** Admin schema migrations

### 9.2 Admin RLS Policies
- [ ] Create staff-specific RLS policies
- [ ] Implement cross-tenant access for staff
- [ ] Add data access logging triggers
- [ ] Test staff vs customer access patterns
- [ ] **Deliverable:** Admin RLS policies

### 9.3 Admin App Setup
- [ ] Create admin Next.js app (or route group)
- [ ] Set up admin layout with navigation
- [ ] Implement admin auth and staff verification
- [ ] Create admin middleware (staff check)
- [ ] Build admin login page (`/admin/login`)
- [ ] **Deliverable:** Admin app foundation

### 9.4 Organisation Management
- [ ] Create org list (`/admin/orgs`) with filters
- [ ] Build org detail page (`/admin/orgs/[orgId]`)
- [ ] Implement org status updates
- [ ] Add plan and billing status management
- [ ] Create org members list and management
- [ ] Add org activity dashboard
- [ ] Implement admin audit logging
- [ ] **Deliverable:** Org management system

### 9.5 User Management
- [ ] Create user list (`/admin/users`) with search
- [ ] Build user detail page (`/admin/users/[userId]`)
- [ ] Implement user disable/enable
- [ ] Add password reset trigger
- [ ] Create org membership management
- [ ] Add user activity view
- [ ] **Deliverable:** User management system

---

## Phase 10: Admin Suite - Support & Analytics (Weeks 13-14)

**Goal:** Complete admin suite with support tools and analytics.

### 10.1 Support Tools
- [ ] Create case search (`/admin/cases`)
- [ ] Build read-only case detail view
- [ ] Implement evidence viewer with signed URLs
- [ ] Add data access logging for sensitive views
- [ ] Create exports management
- [ ] Add export download with logging
- [ ] **Deliverable:** Support tools

### 10.2 Analytics Infrastructure
- [ ] Implement platform_events tracking in mobile/web apps
- [ ] Create analytics dashboard (`/admin/analytics`)
- [ ] Build metrics queries (DAU/WAU/MAU, cases, uploads)
- [ ] Add charts for usage trends
- [ ] Create org drill-down analytics
- [ ] Implement performance optimizations
- [ ] **Deliverable:** Analytics dashboard

### 10.3 Insights & Data Products
- [ ] Create insights dashboard (`/admin/insights`)
- [ ] Build aggregated metrics queries (anonymized)
- [ ] Add chart components for insights
- [ ] Implement CSV export functionality
- [ ] Add audit logging for data exports
- [ ] **Deliverable:** Insights dashboard

### 10.4 System Health & Compliance
- [ ] Create system health dashboard (`/admin/system-health`)
- [ ] Implement storage usage queries
- [ ] Add background job monitoring
- [ ] Create error log viewer
- [ ] Build audit log viewer (`/admin/audit`)
- [ ] Add data access log viewer
- [ ] Implement search and filters
- [ ] **Deliverable:** System monitoring and compliance tools

---

## Phase 11: Integration & Polish (Weeks 15-16)

**Goal:** Integrate all systems, add polish, and prepare for launch.

### 11.1 Cross-Platform Integration
- [ ] Ensure mobile and web apps share same data model
- [ ] Test case sync between platforms
- [ ] Verify evidence uploads work from both platforms
- [ ] Test mandate assignments across platforms
- [ ] **Deliverable:** Integrated platform

### 11.2 Performance Optimization
- [ ] Optimize database queries (add missing indexes)
- [ ] Implement caching strategies
- [ ] Optimize image/video loading
- [ ] Add pagination where needed
- [ ] Performance test and optimize
- [ ] **Deliverable:** Optimized performance

### 11.3 Error Handling & Monitoring
- [ ] Implement comprehensive error boundaries
- [ ] Add error logging and monitoring
- [ ] Create user-friendly error messages
- [ ] Set up error alerting (optional)
- [ ] **Deliverable:** Robust error handling

### 11.4 Testing & QA
- [ ] Write unit tests for critical functions
- [ ] Create integration tests for key flows
- [ ] Test RLS policies thoroughly
- [ ] Test offline functionality on mobile
- [ ] Perform end-to-end testing
- [ ] **Deliverable:** Tested application

### 11.5 Documentation & Deployment
- [ ] Write user documentation
- [ ] Create admin documentation
- [ ] Set up deployment pipelines
- [ ] Configure production environments
- [ ] Set up monitoring and alerts
- [ ] **Deliverable:** Production-ready system

---

## Phase 12: Future Enhancements (Post-MVP)

**Goal:** Additional features beyond MVP.

### 12.1 Email Integration
- [ ] Integrate email service (SendGrid, AWS SES, etc.)
- [ ] Implement email sending from comms templates
- [ ] Add email tracking
- [ ] Create email templates library

### 12.2 Advanced Reporting
- [ ] Add more report templates
- [ ] Implement report customization
- [ ] Add report preview before export
- [ ] Create report analytics

### 12.3 Mobile App Enhancements
- [ ] Add dark mode
- [ ] Implement advanced camera features
- [ ] Add GPS/location tagging
- [ ] Create offline report editing
- [ ] Read-only assessment report viewing on mobile (render from assessment data)

### 12.6 Digital Signatures & E-sign
- [ ] Digital signature capture on report footer (touch/mouse pad)
- [ ] Signature stored as image in Supabase Storage, referenced on report
- [ ] E-sign workflow: assessor signs → report locked → PDF re-generated with signature
- [ ] Optional counter-signature from insurer/claims technician

### 12.7 Parts Negotiation Workflow
- [ ] Parts price negotiation between assessor and supplier
- [ ] Quote request → counter-offer → acceptance flow
- [ ] Track negotiation history per parts line item
- [ ] Final agreed price flows into parts assessment

### 12.8 Salvage Buyer Management
- [ ] Salvage buyer database (name, contact, specialisation)
- [ ] Salvage allocation workflow for write-offs (assign buyer, record sale price)
- [ ] Salvage value tracking and reconciliation
- [ ] Integration with salvage auction platforms (future)

### 12.9 Paint System Integration
- [ ] Integration with Audatex / SilverDAT paint calculation systems
- [ ] Paint code lookup by vehicle make/model/year
- [ ] Automated paint material and labour calculation
- [ ] Paint system data import/export

### 12.4 Admin Suite Enhancements
- [ ] Add user impersonation (read-only)
- [ ] Implement advanced analytics
- [ ] Create custom dashboards
- [ ] Add automated alerts

### 12.5 Billing Integration
- [ ] Integrate payment provider (Stripe, etc.)
- [ ] Implement subscription management
- [ ] Add usage-based billing
- [ ] Create billing dashboard

---

## Phase 13: Property Loss Adjusting Module (Post-MVP)

**Goal:** Extend the assessment engine to support property claims (buildings, contents, business interruption) alongside motor claims. Property assessments have fundamentally different data structures, financial models, and report formats.

### 13.1 Claim Type Architecture
- [ ] Add `claim_type` enum on `cases` table: `motor`, `property`, `liability`, `other`
- [ ] Branch the assessment UI based on claim type — motor cases route to motor assessment (Phase 7), property cases route to property assessment (this phase)
- [ ] Shared foundation: case management, evidence capture, mandates, comms, export — all claim-type-agnostic
- [ ] **Deliverable:** Claim type selector and routing

### 13.2 Property Assessment Schema
- [ ] Create `property_assessments` table:
  - `id`, `case_id` (FK), `org_id`, `status`, `created_by`, timestamps
  - `assessment_sequence` (initial/supplementary/re_inspection), `parent_assessment_id`
  - Instruction fields (insurer, claim number, date of loss, etc. — shared with motor)
  - Client/Insured fields
  - `outcome` enum (repair/replace/cash_settlement/rejected/further_investigation)

- [ ] Create `property_details` table:
  - `assessment_id`, `property_type` (residential/commercial/industrial/strata)
  - `address`, `suburb`, `city`, `postal_code`, `province`
  - `construction_type` (brick/timber/mixed/prefab/other)
  - `roof_type` (tile/slate/metal/thatch/flat/other)
  - `year_built`, `floor_area_sqm`, `number_of_floors`
  - `sum_insured_building`, `sum_insured_contents`
  - `occupancy_status` (occupied/vacant/tenanted)
  - `property_notes`

- [ ] Create `property_damage_items` table:
  - `assessment_id`, `room_or_area` (e.g. "Kitchen", "Roof", "External wall — north")
  - `damage_type` (fire/water/storm/impact/theft/vandalism/subsidence/other)
  - `description`, `severity` (minor/moderate/severe/total)
  - `repair_or_replace` (repair/replace)
  - `estimated_cost`, `is_approved` (boolean)
  - `photo_evidence_id` (FK to evidence)
  - `notes`

- [ ] Create `contents_items` table (for contents claims):
  - `assessment_id`, `item_description`, `room_or_area`
  - `age_years`, `condition_pre_loss` (new/good/fair/worn/poor)
  - `replacement_value`, `depreciated_value`, `settlement_value`
  - `proof_of_ownership` (receipt/photo/declaration/none)
  - `is_approved` (boolean), `notes`

- [ ] Create `property_financials` table:
  - `assessment_id`, `building_damage_total`, `contents_damage_total`
  - `professional_fees` (architect, engineer, project management)
  - `temporary_accommodation` (if applicable — ALE: Additional Living Expenses)
  - `business_interruption` (if applicable)
  - `total_excl_vat`, `vat_amount`, `total_incl_vat`, `less_excess`, `grand_total`
  - `underinsurance_percentage` (if sum insured < replacement value — average clause applies)
  - `average_clause_applied` (boolean), `adjusted_total`

- [ ] Add RLS policies for all property tables
- [ ] **Deliverable:** Complete property assessment schema

### 13.3 Property Assessment Input Module
- [ ] Property-specific assessment tabs:
  - **Instruction & Parties** (shared structure with motor)
  - **Property Details** (address, construction, occupancy, sum insured)
  - **Building Damage** (room-by-room damage items with photos, repair/replace, costs)
  - **Contents Claim** (item-by-item with age, condition, depreciation, proof of ownership)
  - **Professional Fees & Additional Costs** (architect, engineer, temporary accommodation, business interruption)
  - **Outcome & Financials** (underinsurance/average clause check, settlement calculator)
  - **Findings** (cause of loss analysis, fraud indicators adapted for property, recommendations)
- [ ] **Deliverable:** Property assessment input module

### 13.4 Property Report Builder
- [ ] Property-specific report template (different sections from motor):
  - Header, Client, Instruction, Property Details, Damage Summary with photos, Contents Schedule, Financial Summary, Underinsurance Analysis, Outcome, Findings, Footer
- [ ] Support average clause calculation in financial section
- [ ] **Deliverable:** Property assessment report preview

### 13.5 Property Export
- [ ] Extend Phase 8 PDF export to support property assessment report format
- [ ] Include property-specific attachments (contents schedule, damage photos by room)
- [ ] **Deliverable:** Property assessor pack export

---

## Phase 14: Liability & Specialist Assessments (Post-MVP)

**Goal:** Extend the platform to support liability claims and specialist assessment types.

### 14.1 Liability Assessment Module
- [ ] Third-party liability claims (injury, property damage caused to others)
- [ ] Liability assessment schema and input module
- [ ] Liability-specific financial model (quantum, contributory negligence, apportionment)
- [ ] **Deliverable:** Liability assessment support

### 14.2 Specialist Assessment Types
- [ ] Heavy commercial vehicles (trucks, earthmoving equipment — different value guides)
- [ ] Motorcycles and watercraft
- [ ] Agricultural equipment
- [ ] Cell phone / electronics claims (warranty and insurance)
- [ ] **Deliverable:** Specialist vehicle type support

---

## Phase 15: Org Stationery & Branding (Post-MVP Priority 1)

**Goal:** Allow assessors and investigators to fully brand their document outputs (reports, invoices, report packs) as their own. Refrag presence is limited to a single tiny "Powered by Refrag" footer note.

### 15.1 Stationery Settings Page
- [ ] Create `/app/settings/stationery` page
- [ ] Logo upload (PNG/JPG/SVG ≤ 2 MB) → Supabase Storage `org-assets` bucket
- [ ] Three colour pickers: Primary, Accent, Text — each with:
  - Hex input (manual brand hex entry)
  - Colour swatch picker
  - "Detect from logo" button — GPT-4o Vision reads dominant/secondary colours → suggests hex → user confirms
- [ ] Live preview panel: miniature report header + invoice header, updates in real time
- [ ] Two preview tabs: Report Preview, Invoice Preview
- [ ] "Print sample" button — generates one-page sample PDF
- [ ] **Deliverable:** Stationery settings with live preview

### 15.2 Apply Branding to Documents
- [ ] Update `AssessmentReport.tsx` to use `org.primary_colour`, `org.accent_colour`, `org.logo_url`
- [ ] Update invoice component to use stationery settings
- [ ] Report pack cover page (Phase 8 rewrite) uses stationery
- [ ] "Powered by Refrag · refrag.app" in 7pt grey — non-removable, applied at generation level
- [ ] **Deliverable:** All document outputs reflect org branding

### 15.3 Schema
- [ ] Add `logo_url`, `primary_colour`, `accent_colour`, `text_colour`, `stationery_updated_at` to org settings table
- [ ] RLS: only org admins can update stationery
- [ ] **Deliverable:** Stationery schema and policies

---

## Phase 16: Investigator Tool (Post-MVP Priority 2)

**Goal:** Build a parallel investigation workflow alongside the assessment workflow. Investigations are narrative-heavy, interview-driven, and produce a structured investigation report rather than a financial/technical assessment report.

### 16.1 Investigation Schema
- [ ] Create `investigations` table (parallel to `motor_assessments`):
  - `id`, `case_id`, `org_id`, `status`, `created_by`, timestamps
  - `investigation_type` (fraud/theft/liability/general)
  - `outcome` (substantiated/unsubstantiated/partially_substantiated/referred_siu/rejected)
  - Core instruction fields shared with assessments
- [ ] Create `investigation_parties` table (insured, witnesses, third parties, suspects)
- [ ] Create `investigation_interviews` table (party, date, location, summary, key_admissions)
- [ ] Create `investigation_findings` table (finding number, description, evidence_id FK, risk_level)
- [ ] Create `investigation_red_flags` table (flag type, description, severity)
- [ ] RLS policies for all tables
- [ ] **Deliverable:** Investigation schema

### 16.2 Investigation Input Module
- [ ] New tab structure within `/app/cases/[id]/investigation`:
  - **Instruction** — shared structure with assessment
  - **Parties & Statements** — insured, witnesses, third parties; interview records
  - **Document Review** — policy documents, claim form, prior claims history notes
  - **Site Visit** — date, location, findings from physical inspection
  - **Red Flags** — fraud indicator checklist adapted for investigation context
  - **Findings & Recommendation** — numbered findings, supporting evidence links, outcome
- [ ] **Deliverable:** Investigation input module

### 16.3 Investigation Report Builder
- [ ] Investigation-specific report template:
  - Cover page, mandate/instruction, parties, methodology, findings (numbered), evidence annexure index, red flag summary, outcome and recommendation, investigator declaration
- [ ] Narrative text fields (rich text)
- [ ] Evidence annexure: linked photos compile to numbered appendix
- [ ] **Deliverable:** Investigation report preview

### 16.4 Investigation Mandate Checklists
- [ ] Adapt mandate system for investigation-specific checklists (e.g. SIU requirements, insurer-specific investigation mandates)
- [ ] **Deliverable:** Investigation mandate support

---

## Phase 17: Resend Email / Comms Integration (Post-MVP Priority 3)

**Goal:** Build transactional email throughout the platform using Resend, replacing all stub email buttons and wiring the in-app comms log.

### 17.1 Resend Setup
- [ ] Sign up at resend.com, configure sending domain
- [ ] Add `RESEND_API_KEY` to environment
- [ ] Install `resend` package
- [ ] Create `/api/comms/send` server route:
  - Accepts `{ to, template_id, case_id, assessment_id? }`
  - Resolves placeholders from live case/assessment data
  - Sends via Resend API
  - Auto-logs to `comms_log` table
- [ ] **Deliverable:** Working email send route

### 17.2 Email Templates
- [ ] Build templates in Resend dashboard + mirror template metadata in app
  - Assessment Instruction Received
  - Assessment Complete (with report pack link/attachment)
  - Write-off Notification
  - Request for Additional Information
  - Invoice delivery
  - Report Pack Delivery
- [ ] Wire template placeholders: `{{CaseNumber}}`, `{{ClaimNumber}}`, `{{InsurerName}}`, `{{AssessorName}}`, `{{Outcome}}`, `{{DateAssessed}}`, `{{PolicyNumber}}`
- [ ] **Deliverable:** Full email template library

### 17.3 In-App Comms Tab
- [ ] Wire `/app/cases/[id]/comms` to send real emails via the `/api/comms/send` route
- [ ] Template picker → preview with resolved placeholders → send → auto-logged
- [ ] Manual log entries (phone, WhatsApp) still supported
- [ ] Sent email status from Resend webhooks (optional)
- [ ] **Deliverable:** Fully functional comms tab

### 17.4 Report Pack Email
- [ ] Wire "Email to Insurer" button in Report Pack page
- [ ] Uses `insurer_email` from assessment instruction
- [ ] Attaches or links pack documents
- [ ] **Deliverable:** Report pack email delivery

---



- **Phase 1:** Foundation (Week 1)
- **Phase 2:** Mobile Core (Weeks 1-2)
- **Phase 3:** Mobile Evidence (Weeks 3-4)
- **Phase 4:** Mobile Mandates (Week 5)
- **Phase 5:** Web Foundation (Weeks 6-7)
- **Phase 6:** Web Evidence/Mandates (Week 8)
- **Phase 7:** Assessment Engine, OCR Ingestion & Doc Ingestion (Weeks 9–11) — ~85% complete
- **Phase 8:** Export & Assessor Pack Generation — Needs rewrite for Phase 7 data model (Week 12)
- **Phase 9:** Admin Foundation (Weeks 13-14)
- **Phase 10:** Admin Complete (Weeks 15-16)
- **Phase 11:** Integration & Polish (Weeks 17-18)
- **Phase 12:** Future Enhancements (Post-MVP)
- **Phase 13:** Property Loss Adjusting Module (Post-MVP)
- **Phase 14:** Liability & Specialist Assessments (Post-MVP)
- **Phase 15:** Org Stationery & Branding (Post-MVP Priority 1) 🆕
- **Phase 16:** Investigator Tool (Post-MVP Priority 2) 🆕
- **Phase 17:** Resend Email / Comms Integration (Post-MVP Priority 3) 🆕

**Total MVP Timeline:** ~18 weeks (4–5 months)

---

## Key Dependencies

1. **Mobile app must be built first** (as specified in requirements)
2. **Database schema must be complete** before any app development
3. **RLS policies must be in place** before testing with real data
4. **Admin suite depends on** platform_events tracking being implemented
5. **Phase 8 (Export) depends on** Phase 7 (Assessment Engine) being complete — PDF must render the new 20-section report
6. **Phase 7 OCR module depends on** Google Cloud Vision API project and service account being configured
7. **Phase 13 (Property) depends on** Phase 7 architecture — claim_type branching must be designed into the case model
8. **Supplementary assessments depend on** initial assessment being submitted first

---

## Risk Mitigation

1. **Offline-first complexity:** Start with basic offline queue, iterate
2. **PDF generation complexity:** Use Puppeteer to render the same HTML as the screen preview — ensures visual parity
3. **RLS complexity:** Test RLS policies thoroughly in Phase 1
4. **Cross-platform sync:** Ensure consistent data models from start
5. **Performance at scale:** Plan for indexing and query optimization early
6. **OCR accuracy:** Field extraction from scanned documents varies by layout quality — always require human review before applying to assessment
7. **Labour rate complexity:** Start with a simple rate table per operation type; defer Audatex/SilverDAT integration to Phase 12
8. **Property vs Motor branching:** Design the `claim_type` field on `cases` in Phase 7 even though property module is Phase 13 — avoids schema migration later

---

## Success Criteria

- [ ] Mobile app works offline-first with reliable upload queue
- [ ] Web app provides full case management and reporting
- [ ] Admin suite enables full platform management
- [ ] Assessor Pack PDF generation works correctly
- [ ] All RLS policies enforce proper data isolation
- [ ] System handles multiple organisations correctly
- [ ] Performance is acceptable with 100+ cases per org
- [ ] Error handling is comprehensive and user-friendly
