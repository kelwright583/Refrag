# Phase 7: Assessment Report Engine & Document Ingestion

## Status: 🔄 ~85% COMPLETE — OCR wiring + comms remaining

---

## What Changed from Original Phase 7

| Aspect | Old Phase 7 | New Phase 7 |
|---|---|---|
| **Scope** | Generic markdown report builder | Domain-specific assessment report engine |
| **Data model** | Single `reports` + `report_sections` table | 15 new assessment-specific tables |
| **Vehicle values** | Not handled | OCR-ingested from MM / TransUnion printouts |
| **Repair estimates** | Not handled | OCR-ingested + editable line items |
| **Financial calcs** | Not handled | Full calculator (VAT, betterment, write-off settlement) |
| **Claim outcomes** | Not modelled | 6 outcomes (repairable, write-off, theft, partial theft, rejection, further investigation) |
| **Report preview** | Markdown render | 15-section professional printable report |
| **Report pack** | Not modelled | Bundle: assessment report + MM docs + parts quote + repairer quote + photos |
| **Document ingestion** | Not planned | Full AI pipeline: OCR → PII-safe extraction → GPT-4o → review panel → auto-populate |

---

## What Was Built (Complete)

### Database
- `database/phase7_assessment_schema.sql` — 15 tables, 14 enums
- `database/phase7_rls_policies.sql`
- `database/phase7b_report_pack_schema.sql` — `report_packs`, `report_pack_items`
- `database/phase7b_report_pack_rls.sql`
- Supabase Storage bucket `ingested-docs` — private, 50 MB limit, org-scoped RLS

### Types & Logic
- `web-app/src/lib/types/assessment.ts`
- `web-app/src/lib/validation/assessment.ts`
- `web-app/src/lib/assessment/calculator.ts` — Max repair, betterment, VAT, write-off settlement, full financials
- `web-app/src/lib/types/report-pack.ts` + `validation/report-pack.ts`
- `web-app/src/lib/types/ingestion.ts` — `ExtractionResult`, `ExtractedField`, `DocumentIngestionInput`, `ConfirmedFields`
- `web-app/src/lib/ai/field-mapper.ts` — 40+ alias lookups; local PII regex (never sent to AI)
- `web-app/src/lib/ai/prompts.ts` — `INGEST_DOCUMENT_SYSTEM`, `INGEST_DOCUMENT_USER` added

### API Routes
All 19 assessment API routes complete — see `PROJECT_STATUS.md` for full table.
Key addition: `POST /api/ai/ingest-document` — full ingestion pipeline (pdf-parse / mammoth / GPT-4o Vision → PII-safe extraction → `assessment_documents` record → AI audit log).

### UI — 9 Assessment Tabs
1. **InstructionTab** — with `DocumentDropZone` for auto-population from instruction documents
2. **VehicleDetailsTab** — auto-populated from `case.risk_items[0].asset_data` on creation
3. **TyresTab** — 4-tyre condition grid
4. **DamagesLabourTab** — pre-existing damages + repair line items, drop zone + click-to-browse
5. **PartsAssessmentTab** — parts supplier, amounts, drop zone + click-to-browse
6. **MMCodesValuesTab** — MM Guide values, derived thresholds, drop zone + click-to-browse
7. **PhotosEvidenceTab** — upload + link to report sections, drop zone + click-to-browse
8. **OutcomeFinancialsTab** — outcome picker, live financial summary
9. **FindingsTab** — completeness checklist, mark ready / submit

### Report & Report Pack
- `AssessmentReport.tsx` — 15-section printable report
- `/app/cases/[id]/assessment/[assessmentId]/report/page.tsx` — print toolbar
- `globals.css` — A4 print styles
- `/app/cases/[id]/report/page.tsx` — Report Pack UI: list, create, toggle items in/out

### Ingestion Components
- `DocumentDropZone.tsx` — reusable, supports compact mode
- `ExtractionReviewPanel.tsx` — confidence badges (green/amber/red), PII labels, editable rows, Accept All / Clear All

### Settings
- `/app/settings/assessment/page.tsx` — VAT, max repair %, labour rates per op type, repairers, suppliers, disclaimer

---

## What Remains

### 7.2 — Google Vision OCR (⏳ pending)
The drop zones in DamagesLabourTab, PartsAssessmentTab, and MMCodesValuesTab currently show a stub "OCR complete" message. They need to be wired to the real `/api/ai/ingest-document` route (which already handles PDFs and images) the same way InstructionTab and CreateCaseModal are wired.

**Steps to complete:**
1. Set up Google Cloud Vision API credentials (see UPCOMING_FEATURES.md — Priority 3)
2. Replace stub `processFile()` in each tab with a call to `ingestDocument()` + show `ExtractionReviewPanel`
3. Map MM valuation fields to `MMCodesValuesTab` form state
4. Map repairer quote fields to `DamagesLabourTab` repairer + line items
5. Map parts quote fields to `PartsAssessmentTab` form state

### 7.7 — Communications (⏳ partial)
The comms template system exists. Assessment-specific placeholders (`{{ClaimNumber}}`, `{{Outcome}}`, `{{DateAssessed}}`, `{{AssessorName}}`, `{{InsurerName}}`) need to be wired from assessment data into the template resolution logic. Resend integration is a separate phase (see Phase 17).

---

## Testing Checklist

- [ ] Create a new case → drop an assessment instruction PDF → verify fields auto-populate in New Case modal
- [ ] Create an assessment → verify vehicle details auto-populate from case risk item
- [ ] Open InstructionTab → drop an instruction PDF → verify review panel shows → apply fields
- [ ] Fill all 9 tabs → mark ready → open report preview → verify all sections render
- [ ] Create report pack → verify auto-populated items from assessment documents → toggle items
- [ ] Print report → verify A4 layout, no overflow
- [ ] Verify PII fields (insured name, contact) show "PII — local only" badge in review panel and were not logged to AI audit log
