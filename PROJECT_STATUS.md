# Refrag Project Status

**Last Updated:** 18 March 2026
**Current Focus:** Full audit remediation complete — all phases through 17 built, infrastructure hardened

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

## ✅ Phase 7: Assessment Report Engine & Document Ingestion — COMPLETE

### Schema & Database
- ✅ 15 new tables, 14 new enums with full RLS
- ✅ Report pack tables (report_packs, report_pack_items) with RLS

### Types, Validation & Client Layer
- ✅ Full TypeScript types, Zod schemas, financial calculator, API functions, React Query hooks

### API Routes (all complete)
- ✅ Full CRUD for assessments, vehicle details, tyres, damages, values, repair, parts, financials, evidence links
- ✅ Assessment settings, repairers, suppliers
- ✅ Report packs CRUD with auto-population

### UI Tabs (9-tab Assessment Editor)
- ✅ InstructionTab, VehicleDetailsTab, TyresTab, DamagesLabourTab, PartsAssessmentTab, MMCodesValuesTab, PhotosEvidenceTab, OutcomeFinancialsTab, FindingsTab

### Document Ingestion Engine
- ✅ pdf-parse + mammoth for local text extraction
- ✅ Field mapper with 40+ alias mappings and PII regex extraction
- ✅ GPT-4o classification and structured extraction
- ✅ DocumentDropZone and ExtractionReviewPanel components

### OCR Integration (NEW — 18 March 2026)
- ✅ `/api/ai/ocr-extract` route: PDF text → pdf-parse, images → Google Vision, then GPT-4o field extraction
- ✅ DamagesLabourTab, PartsAssessmentTab, MMCodesValuesTab wired to real OCR with progress states
- ✅ Graceful fallback when Google Vision not configured (pdf-parse only for PDFs)

### Communications Templates (NEW — 18 March 2026)
- ✅ Assessment-specific placeholders: `{{Outcome}}`, `{{ClaimNumber}}`, `{{InsurerName}}`, `{{DateAssessed}}`, etc.
- ✅ Placeholder resolution utility with full context support
- ✅ Templates settings page updated with expandable placeholder reference

### Report & Report Pack
- ✅ Full 15-section printable AssessmentReport with org stationery branding
- ✅ Report pack page with photo PDF generation, invoice inclusion check, ZIP download, email to insurer

---

## ✅ Phase 8: Export & Assessor Pack Generation — COMPLETE (Rewritten)

- ✅ Export page rewritten for Phase 7 assessment data model
- ✅ Assessment selector (when multiple assessments per case)
- ✅ Checkbox options: report PDF, photo evidence, original documents
- ✅ PDF generation via pdfkit rendering all 15 assessment report sections
- ✅ Org stationery branding applied to PDF (logo, colours)
- ✅ Photo evidence appended if selected
- ✅ Stored in Supabase Storage with signed URL downloads
- ✅ Export history with version tracking and audit logging

---

## ✅ Phase 9: Admin Suite — Foundation — COMPLETE

- ✅ Admin app with staff verification middleware
- ✅ Organisation management (list, detail, status, plan, members)
- ✅ User management with real Supabase Admin API (disable/enable, password reset)

---

## ✅ Phase 10: Admin Suite — Support & Analytics — COMPLETE

- ✅ Case search and read-only case detail
- ✅ Evidence viewer with data access logging
- ✅ Analytics dashboard (DAU/WAU/MAU, cases, evidence)
- ✅ Insights dashboard with anonymised aggregates and CSV export
- ✅ System health with real storage stats via admin API
- ✅ Audit log viewer, data access log viewer

---

## ✅ Phase 11: Integration & Polish — COMPLETE

- ✅ Error boundaries on both web-app and admin-suite (including ErrorBoundary components + error.tsx + global-error.tsx)
- ✅ Toast notification system on both apps
- ✅ Pagination support on cases and evidence APIs
- ✅ React Query caching configured
- ✅ Cross-platform type consistency verified
- ✅ Silent error catches replaced with proper error handling across all pages

---

## ✅ Phase 15: Org Stationery & Branding — COMPLETE

- ✅ Schema migration: logo_url, primary_colour, accent_colour, text_colour, footer_disclaimer
- ✅ `org-assets` storage bucket with org-scoped RLS
- ✅ Stationery settings page: logo upload, 3 colour pickers with hex inputs, footer disclaimer
- ✅ Live preview panel updating in real time
- ✅ AssessmentReport.tsx uses stationery (logo, colours, custom footer + "Powered by Refrag")
- ✅ Export PDF uses stationery branding
- ✅ Settings hub updated with Stationery & Branding card

---

## ✅ Phase 17: Resend Email / Comms Integration — COMPLETE

- ✅ `/api/comms/send` route: template resolution, Resend send, auto-log to comms_log
- ✅ 6 professional email templates (instruction received, assessment complete, write-off, RFI, invoice, report pack)
- ✅ Comms tab wired: template picker, recipient auto-fill, body preview, send + auto-log
- ✅ Report pack "Email to Insurer" wired
- ✅ Graceful 503 when RESEND_API_KEY not configured

---

## ✅ Onboarding Redesign — COMPLETE

- ✅ 5-step setup wizard: org details → logo & branding → financial defaults → approved repairers → complete
- ✅ Progress saved at each step via existing APIs
- ✅ Getting Started checklist on dashboard (5 items, progress bar, dismiss, auto-hide when complete)
- ✅ Org profile API (GET/PATCH)
- ✅ Onboarding completion API

---

## ✅ Infrastructure & Security Hardening — COMPLETE

### Database
- ✅ All RLS files made idempotent (DROP POLICY IF EXISTS before CREATE)
- ✅ Migration 005 policies updated with `is_staff()` access
- ✅ RLS added to `case_number_sequences`
- ✅ `intake_documents.created_by` FK fixed (ON DELETE SET NULL)
- ✅ `run-migrations.js` updated to include 007 + Phase 7/7B + Phase 15
- ✅ `migrations/README.md` documents full run order

### Security
- ✅ Inbound email webhook requires `INBOUND_EMAIL_SECRET` (503 if missing)
- ✅ Google Vision uses service account credentials (not unsupported apiKey)
- ✅ Resend client validates API key before creating
- ✅ All `.env.example` files updated with all used env vars
- ✅ Security headers on both web-app and admin-suite (CSP, X-Frame-Options, etc.)

### Code Quality
- ✅ `strict: true` enabled in admin-suite tsconfig
- ✅ `any` types replaced with proper types in admin API routes
- ✅ Admin user management wired to real Supabase Admin API
- ✅ System health uses real storage stats
- ✅ Toast notifications replace all `alert()` calls

### Error Handling
- ✅ ErrorBoundary + error.tsx + global-error.tsx on both apps
- ✅ Toast notification system on both apps
- ✅ All silent `.catch(() => {})` replaced with proper logging and user feedback

### Testing & CI/CD
- ✅ Vitest configured with jsdom, React Testing Library
- ✅ 59 initial tests (calculator, placeholder resolution, error handling)
- ✅ GitHub Actions CI: lint, typecheck, test, build for both apps
- ✅ Bundle analysis configured (@next/bundle-analyzer)

---

## 📋 Upcoming Priorities (Future)

### Phase 12 — Future Enhancements (Post-MVP)
- Digital signatures & e-sign
- Parts negotiation workflow
- Salvage buyer management
- Paint system integration (Audatex/SilverDAT)
- Dark mode (mobile)
- Advanced camera features (mobile)
- Billing integration (Stripe)

### Phase 13 — Property Loss Adjusting Module
- Property assessment schema and input module
- Room-by-room damage items, contents schedule
- Underinsurance/average clause calculation
- Property-specific report template

### Phase 14 — Liability & Specialist Assessments
- Liability assessment module
- Heavy commercial vehicles, motorcycles, watercraft, agricultural equipment

### Phase 16 — Investigator Tool
- Investigation schema (parties, interviews, findings, red flags)
- Investigation input module (6 tabs)
- Investigation report builder (narrative-heavy)
- Investigation mandate checklists

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
| 7 — Assessment Engine & Doc Ingestion | ✅ Complete | 100% |
| 8 — Export (rewritten for Phase 7) | ✅ Complete | 100% |
| 9 — Admin Foundation | ✅ Complete | 100% |
| 10 — Admin Analytics | ✅ Complete | 100% |
| 11 — Integration & Polish | ✅ Complete | 100% |
| 12 — Future Enhancements | ⏳ Pending | 0% |
| 13 — Property Loss Adjusting | ⏳ Pending | 0% |
| 14 — Liability & Specialist | ⏳ Pending | 0% |
| 15 — Stationery & Branding | ✅ Complete | 100% |
| 16 — Investigator Tool | ⏳ Pending | 0% |
| 17 — Resend Comms | ✅ Complete | 100% |
| Onboarding Redesign | ✅ Complete | 100% |
| Infrastructure Hardening | ✅ Complete | 100% |

---

## 🔑 External Configuration Required (Your Action)

Before going live, you need to configure these API keys and external services:

| Item | Where to Set | Notes |
|---|---|---|
| **Supabase project** | All `.env` files | URL + anon key for all apps |
| **SUPABASE_SERVICE_ROLE_KEY** | `admin-suite/.env` | For admin user management |
| **RESEND_API_KEY** | `web-app/.env` | For email sending. Sign up at resend.com |
| **RESEND_FROM_EMAIL** | `web-app/.env` | Requires DNS domain verification |
| **OPENAI_API_KEY** | `web-app/.env` | For document ingestion AI extraction |
| **Google Cloud Vision** | `web-app/.env` | Service account JSON. See `UPCOMING_FEATURES.md` Priority 3 for step-by-step setup |
| **Google Maps API key** | `web-app/.env` + `mobile-app/.env` | For address autocomplete |
| **INBOUND_EMAIL_SECRET** | `web-app/.env` | Shared secret for email webhook |
| **Run database migrations** | Supabase SQL Editor | Run `schema.sql` → `rls_policies.sql` → `node run-migrations.js` |
