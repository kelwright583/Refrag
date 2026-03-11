# Refrag Project Status

**Last Updated:** 5 March 2026
**Current Focus:** Document Ingestion Engine complete — next priorities noted below

---

## ✅ Phase 1: Foundation & Infrastructure — COMPLETE

- ✅ All 17 core tables + admin tables, enum types, indexes, constraints
- ✅ RLS on all tables with org-scoped policies and helper functions
- ✅ Supabase project configured (auth, storage bucket: `evidence`)
- ✅ Three repos scaffolded: mobile-app (Expo), web-app (Next.js), admin-suite (Next.js)

---

## ✅ Phase 2: Mobile App — Core Foundation — COMPLETE

- ✅ React Query, Zod, Zustand wired
- ✅ Cases list with search, create, update, status management
- ✅ CaseCard, CreateCaseModal, case detail screen
- ✅ Auth flow with org selection

---

## ✅ Phase 3: Mobile App — Evidence Capture — COMPLETE

- ✅ Offline-first upload queue with AsyncStorage persistence
- ✅ Camera, gallery, document pickers
- ✅ Tagging system (suggested + custom)
- ✅ Queue worker with exponential backoff retry

---

## ✅ Phase 4: Mobile App — Mandates & Notes — COMPLETE

- ✅ Mandate selection, requirement_checks auto-creation, checklist UI
- ✅ Evidence linking to requirements
- ✅ Case notes CRUD and comms log entries
- ✅ Loading skeletons, empty states, toast notifications

---

## ✅ Phase 5: Web App — Foundation & Case Management — COMPLETE

- ✅ Dashboard, case list, search, filters
- ✅ New Case modal with full form
- ✅ Case detail page with overview, contacts, status/priority management
- ✅ Sidebar navigation, top bar, auth middleware

---

## ✅ Phase 6: Web App — Evidence & Mandates — COMPLETE

- ✅ Drag-and-drop evidence upload to Supabase Storage
- ✅ Evidence grid with thumbnails, tags editor, signed URL viewer
- ✅ Mandate tab: assignment, checklist, evidence linking, completeness summary

---

## 🔄 Phase 7: Assessment Report Engine & Document Ingestion — IN PROGRESS (~85%)

> The original Phase 7 (basic markdown reports) was fully superseded. See `PHASE_7_ASSESSMENT_ENGINE.md` for the complete redesign spec.

### What has been built

#### Schema & Database
- ✅ `database/phase7_assessment_schema.sql` — 15 new tables, 14 new enums
  - `motor_assessments`, `vehicle_details`, `tyre_details`, `pre_existing_damages`, `vehicle_values`, `repair_assessments`, `repair_line_items`, `parts_assessments`, `claim_financials`, `assessment_documents`, `report_evidence_links`
- ✅ `database/phase7_rls_policies.sql` — Full RLS for all new tables
- ✅ `database/phase7b_report_pack_schema.sql` — `report_packs`, `report_pack_items` tables
- ✅ `database/phase7b_report_pack_rls.sql` — RLS for report pack tables

#### Types, Validation & Client Layer
- ✅ `web-app/src/lib/types/assessment.ts` — Full TypeScript types for all assessment entities
- ✅ `web-app/src/lib/validation/assessment.ts` — Zod schemas for all assessment forms
- ✅ `web-app/src/lib/assessment/calculator.ts` — Financial calculator (max repair, betterment, VAT, write-off settlement)
- ✅ `web-app/src/lib/api/assessments.ts` — Client-side API functions
- ✅ `web-app/src/hooks/use-assessments.ts` — React Query hooks for all assessment operations
- ✅ `web-app/src/lib/types/report-pack.ts` — Report pack types
- ✅ `web-app/src/lib/validation/report-pack.ts` — Report pack Zod schemas
- ✅ `web-app/src/lib/api/report-packs.ts` — Report pack client API
- ✅ `web-app/src/hooks/use-report-packs.ts` — Report pack React Query hooks

#### API Routes (all complete)
| Route | Purpose |
|---|---|
| `POST/GET /api/assessments` | Create / list assessments. Auto-copies case risk item vehicle data into `vehicle_details` on creation |
| `GET/PATCH/DELETE /api/assessments/[id]` | Full assessment + sub-data fetch; PATCH creates version snapshot on "ready" |
| `/api/assessments/[id]/vehicle` | Upsert vehicle details |
| `/api/assessments/[id]/tyres` | Bulk upsert tyre details |
| `/api/assessments/[id]/damages` | Add/delete pre-existing damage |
| `/api/assessments/[id]/values` | Upsert vehicle values |
| `/api/assessments/[id]/repair` | Upsert repair assessment |
| `/api/assessments/[id]/repair/line-items` | Add/update/delete repair line items |
| `/api/assessments/[id]/parts` | Upsert parts assessment |
| `/api/assessments/[id]/financials` | Upsert/recalculate financials |
| `/api/assessments/[id]/evidence-links` | Report photo links |
| `/api/settings/assessment` | Org assessment settings |
| `/api/settings/assessment/repairers` | Approved repairers |
| `/api/settings/assessment/suppliers` | Preferred suppliers |
| `/api/report-packs` | Create / list report packs (auto-populates items from assessment docs on creation) |
| `/api/report-packs/[id]` | Get / update / delete report pack |
| `/api/report-packs/[id]/items` | Add items to report pack |
| `/api/report-packs/[id]/items/[itemId]` | Patch / delete pack items |
| `POST /api/ai/ingest-document` | Full document ingestion pipeline (pdf-parse / mammoth / GPT-4o Vision → PII-safe extraction → assessment_documents) |

#### UI Tabs (Assessment Editor — 9 tabs)
- ✅ `InstructionTab.tsx` — Insurer/insured/assessor details. **Now includes DocumentDropZone** for auto-populating from instruction PDFs
- ✅ `VehicleDetailsTab.tsx` — Make/model/VIN/reg/condition/damage overview. **Auto-populated from case risk item on creation**
- ✅ `TyresTab.tsx` — 4-tyre condition grid (RF/LF/RR/LR)
- ✅ `DamagesLabourTab.tsx` — Pre-existing damages CRUD + repair line items with betterment/sublet. Drop zone with click-to-browse
- ✅ `PartsAssessmentTab.tsx` — Parts supplier, amounts, OCR drop zone with click-to-browse
- ✅ `MMCodesValuesTab.tsx` — MM Guide / TransUnion values, derived thresholds, OCR drop zone with click-to-browse
- ✅ `PhotosEvidenceTab.tsx` — Drag-drop + click-to-browse photo uploads, link photos to report sections
- ✅ `OutcomeFinancialsTab.tsx` — Outcome picker, live financial summary, settlement calculator
- ✅ `FindingsTab.tsx` — Completeness checklist, mark ready / submit workflow, report preview link

#### Report & Report Pack
- ✅ `AssessmentReport.tsx` — Full 15-section printable report (instruction, insured, vehicle, damage, tyres, pre-existing, values, repairer, line items, parts, financials, outcome, findings, declaration, footer)
- ✅ `/app/cases/[id]/assessment/[assessmentId]/report/page.tsx` — Preview page with Print/PDF toolbar
- ✅ `globals.css` — A4 print styles, page-break control, header repeat
- ✅ `/app/cases/[id]/report/page.tsx` — **Report Pack page**: list packs, create packs (auto-populates items from assessment docs), toggle items in/out, stubbed Download ZIP / Email to Insurer buttons

#### Settings
- ✅ `/app/settings/assessment/page.tsx` — VAT %, max repair %, parts handling %, labour rates per operation type (panel/mech/electrical/paint/structural/trim/glass), disclaimer text, approved repairers list, preferred suppliers list

#### Document Ingestion Engine (new — complete)
- ✅ `pdf-parse` + `mammoth` installed for local text extraction (POPIA-safe — no external API)
- ✅ `web-app/src/lib/types/ingestion.ts` — `ExtractionResult`, `ExtractedField`, `DocumentIngestionInput`, `ConfirmedFields`
- ✅ `web-app/src/lib/ai/field-mapper.ts` — 40+ alias mappings across insurer formats; local PII regex extraction (names, phones, policy numbers never sent to AI)
- ✅ `web-app/src/lib/ai/prompts.ts` — `INGEST_DOCUMENT_SYSTEM` + `INGEST_DOCUMENT_USER` prompts added
- ✅ `web-app/src/app/api/ai/ingest-document/route.ts` — Full pipeline: upload → extract text → PII local extraction → GPT-4o classify/extract → field mapping → assessment_documents persist → AI audit log
- ✅ `web-app/src/lib/api/ingestion.ts` + `web-app/src/hooks/use-ingestion.ts`
- ✅ `web-app/src/components/ingestion/DocumentDropZone.tsx` — Reusable drag-drop + click-to-browse, compact mode, progress/done/error states
- ✅ `web-app/src/components/ingestion/ExtractionReviewPanel.tsx` — Field-by-field review, green/amber/red confidence badges, PII labels, Accept All / Clear All, editable rows
- ✅ `CreateCaseModal.tsx` — DocumentDropZone wired at top; confirmed fields auto-fill insurer, broker, claim ref, loss date, vehicle details
- ✅ Supabase Storage bucket `ingested-docs` (private, 50 MB limit, org-scoped RLS) — to be created via SQL migration provided

#### Click-to-browse audit (completed 5 March 2026)
All drop zones now support both drag-and-drop **and** click-to-browse:
- ✅ `DocumentDropZone.tsx` — always had it
- ✅ `evidence/page.tsx` — always had it
- ✅ `PhotosEvidenceTab.tsx` — added
- ✅ `DamagesLabourTab.tsx` — added
- ✅ `PartsAssessmentTab.tsx` — added
- ✅ `MMCodesValuesTab.tsx` — added

#### Auto-population across "create" flows
- ✅ New Assessment — pre-fills `insurer_name`, `claim_number`, `date_of_loss`, `insured_name`, `assessment_location` from case data; auto-copies vehicle make/model/year/VIN/reg/engine from `case.risk_items[0].asset_data` into `vehicle_details`
- ✅ New Invoice — auto-fills reference, client, and line item detail from case data
- ✅ Report pack title — auto-generated from case data

### What remains in Phase 7
- ⏳ **Google Vision OCR** — wire up real Google Cloud Vision API to the drop zones in Damages/Labour, Parts, and MM Values tabs (currently stubs showing "OCR complete" after a timeout). See Phase 7 note below on setup.
- ⏳ **Communications templates** — assessment-specific `{{Outcome}}`, `{{ClaimNumber}}` etc. placeholders to be added to the existing comms system
- ⏳ **Resend email integration** — see Phase 15 below

---

## ✅ Phase 8: Export & Assessor Pack Generation — COMPLETE (original)

> Note: Phase 8 was built against the original markdown report model. It needs to be rewritten to render the new Phase 7 assessment data model. Tracked in the build plan under Phase 8 rewrite.

- ✅ PDF generation with pdfkit
- ✅ Export tab (`/app/cases/[id]/export`)
- ✅ PDF stored in Supabase Storage (`exports` bucket)
- ✅ Download with signed URLs, export history, audit logging

---

## ✅ Phase 9: Admin Suite — Foundation — COMPLETE

- ✅ Admin app with staff verification middleware
- ✅ Organisation management (list, detail, status, plan, members)
- ✅ User management (list, detail, disable/enable, password reset)

---

## ✅ Phase 10: Admin Suite — Support & Analytics — COMPLETE

- ✅ Case search and read-only case detail
- ✅ Evidence viewer with data access logging
- ✅ Analytics dashboard (DAU/WAU/MAU, cases, evidence)
- ✅ Insights dashboard with anonymised aggregates and CSV export
- ✅ System health, audit log viewer, data access log viewer

---

## ✅ Phase 11: Integration & Polish — COMPLETE

- ✅ Error boundary, error display components, error handling utilities
- ✅ Pagination support on cases and evidence APIs
- ✅ React Query caching configured
- ✅ Cross-platform type consistency verified

---

## 📋 Upcoming Priorities (in order)

### Priority 1 — Org Stationery & Branding (new — see notes)
> Assessors and investigators need to brand their outputs — reports and invoices — as their own, with "powered by Refrag" in tiny text only. Full spec in UPCOMING_FEATURES.md.

### Priority 2 — Report Pack completion
> Report pack needs: assessor's invoice attached, AI-tagged photos compiled to PDF, encouragement to complete invoice before generating pack. Full spec in UPCOMING_FEATURES.md.

### Priority 3 — Google Vision OCR setup
> Walk-through and wiring needed. See UPCOMING_FEATURES.md.

### Priority 4 — Onboarding review
> Onboarding flow needs a rethink — review and redesign.

### Priority 5 — Investigator Tool (next MVP)
> A fundamentally different workflow from assessing. Spec and design needed. See UPCOMING_FEATURES.md.

### Priority 6 — Resend Email / Comms
> Build comms with Resend for transactional emails, templates, and case comms log. See UPCOMING_FEATURES.md.

---

## 📊 Progress Summary

| Phase | Status | % |
|---|---|---|
| 1 — Foundation | ✅ Complete | 100% |
| 2 — Mobile Core | ✅ Complete | 100% |
| 3 — Mobile Evidence | ✅ Complete | 100% |
| 4 — Mobile Mandates | ✅ Complete | 100% |
| 5 — Web Foundation | ✅ Complete | 100% |
| 6 — Web Evidence & Mandates | ✅ Complete | 100% |
| 7 — Assessment Engine & Doc Ingestion | 🔄 In Progress | ~85% |
| 8 — Export (original) | ✅ Complete (needs rewrite for Phase 7 data) | — |
| 9 — Admin Foundation | ✅ Complete | 100% |
| 10 — Admin Analytics | ✅ Complete | 100% |
| 11 — Integration & Polish | ✅ Complete | 100% |
| 12 — Future Enhancements | ⏳ Pending | 0% |
| 13 — Property Loss Adjusting | ⏳ Pending | 0% |
| 14 — Liability & Specialist | ⏳ Pending | 0% |
| 15 — Stationery & Branding | 🆕 New | 0% |
| 16 — Investigator Tool | 🆕 New | 0% |
| 17 — Resend Comms | 🆕 New | 0% |
