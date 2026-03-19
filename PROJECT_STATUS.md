# Refrag Project Status

**Last Updated:** 19 March 2026
**Current Focus:** Master rebuild complete — all 8 stages executed per REFRAG_MASTER_REBUILD_PROMPT.md v3.1

---

## Architecture Overview (Post-Rebuild)

- **Vertical-driven UI** — One 5-tab shell configured by `VERTICAL_CONFIGS`, not separate UIs per professional type
- **Locale-agnostic** — No hardcoded currency symbols, country assumptions, or regulatory references
- **Adapter pattern** — All external services (OCR, AI, Email, PDF, Payment, Storage, Transcription) behind clean interfaces with dry-run fallbacks
- **Billing-gated** — All report pack generation passes through `checkAndDeductPackCredit()` atomic gate
- **Event-instrumented** — All key actions emit `platform_events` for admin analytics

---

## Stage 1: Schema Migration & Core Data Model — COMPLETE

- Complete rebuild schema: `database/rebuild/001_master_schema.sql`
  - Extended `organisations` with vertical support, billing fields, international columns
  - Extended `cases` with vertical, site visit timestamps, intake_source
  - Extended `evidence` with AI classification, valuation flags
  - New tables: `risk_items`, `assessments` (generic), `tyre_assessments`, `investigation_findings`, `time_entries`, `vehicle_values`, `reports`, `report_sections`, `report_evidence_links`, `report_packs`, `report_pack_items`, `invoices`, `invoice_line_items`, `case_contacts`, `case_notes`, `recordings`, `appointments`, `platform_events`, `audit_log`, `admin_audit_log`, `staff_users`
  - Client management tables: `clients`, `client_rate_structures`, `client_rules`
  - Mandate tables: `mandates`, `mandate_requirements`, `case_mandates`, `requirement_checks`
  - Comms tables: `comms_log`, `comms_templates`
  - Intake tables: `intake_documents`, `inbound_emails`
- Complete RLS policies: `database/rebuild/002_rls_policies.sql`
  - Helper functions: `is_org_member()`, `is_org_admin()`, `is_staff()`
  - Standard 4-policy pattern for 27 org-scoped tables
  - Special policies for audit_log (no update/delete), platform_events (staff-only read), staff_users
- `generate_case_number()` SQL function (server-side only, no client-side generation)
- SA-specific hardcoding removed across entire codebase:
  - `formatCurrency()` utility replaces all hardcoded `R` prefixes
  - `formatDate()`/`formatDateTime()`/`formatTime()` replace all `'en-ZA'` locale strings
  - `POPIA` references replaced with configurable `data_protection_regime`
  - `mm_code` column references migrated to `identifier_type` + `identifier_value`
  - Address placeholders made generic
  - VAT rate references made configurable (not hardcoded 15%)
- Billing columns added: `billing_mode`, `monthly_pack_count`, `monthly_pack_limit`, `billing_period_start`
- `VERTICAL_CONFIGS` static config: `web-app/src/lib/verticals/config.ts`
  - All 5 verticals: motor_assessor, property_assessor, loss_adjuster, investigator, general
  - Complete terminology, section configs, report templates, financial modules, outcomes
- Adapter interfaces: `web-app/src/lib/adapters/`
  - OCR (GoogleVision, PdfParse, Mammoth + stub)
  - AI Extraction (OpenAI + stub)
  - Email (Resend + DryRun)
  - PDF (Playwright + PdfKit fallback + stub)
  - Payment (Stripe + stub)
  - Storage (Supabase + stub)
  - Transcription (OpenAI Whisper + stub)

---

## Stage 2: Onboarding, Workspace, Client Management, Comms — COMPLETE

- **Onboarding wizard** (6-step): Professional type selection → Company profile → First client → Assessment settings → Comms setup → Complete
  - Multi-select vertical cards with icons
  - Country-driven defaults (currency, timezone, tax labels)
  - Client creation with inline rate structure
  - Vertical-dependent assessment settings
  - Seeds 3 free report pack credits on completion
- **5-tab case workspace shell**: `web-app/src/components/case/CaseWorkspace.tsx`
  - Tabs: Overview | Capture | Assessment | Report | Pack & Invoice
  - 30 accordion section components (stubs ready for implementation)
  - Section registry mapping `SectionKey` → React component
  - Tab components auto-render sections from vertical config
- **Client management** enhanced:
  - Tabbed interface: Details | Rate Structures | Rules | Mandates
  - Full CRUD for rate structures with inline editing
  - Client rules management
  - API routes for rates and rules
- **Mandate builder**: `web-app/src/app/app/mandates/`
  - List page with filters (client, vertical, active)
  - Creation page with clone-from support
  - Builder page with @dnd-kit drag-and-drop
  - 6 requirement category groups
  - Requirement cards with inline editing, required/optional toggle, evidence type
  - Import from existing mandate modal
  - Full API routes for mandates, requirements, cloning
- **Smart comms trigger system**:
  - `checkCommsTrigger()` function with 9 trigger events
  - `CommsTriggerPrompt` toast with 15s auto-dismiss
  - `EmailPreviewPanel` slide-out panel (editable, template picker)
  - `CommsProvider` React context wrapping the app
  - Default templates per vertical (motor, property, investigator)

---

## Stage 3: OCR Intake Pipeline — COMPLETE

- **Unified pipeline**: `POST /api/intake/process`
  - Multipart upload → Supabase Storage → content detection → adapter routing
  - PDF → pdf-parse (text layer) or Google Vision (scanned)
  - Images → Google Vision documentTextDetection
  - DOCX → mammoth
- **Text normalization**: OCR artifact stripping, whitespace standardization
- **Rule-based field extraction**: Label dictionary with 160+ label variations
- **PII ring-fencing**: Regex detection for phone, email, ID, passport — never sent to AI
- **AI extraction**: For remaining/low-confidence fields (PII-stripped text only)
- **Confidence scoring**: high (exact label match), medium (fuzzy), low (AI-inferred)
- **Extraction schemas**: Per-document-role field definitions (instruction, valuation, quote, statement)
- **ExtractionReviewPanel**: Confidence badges, PII labels, editable values, confirm/re-extract
- **DocumentDropZone**: Reusable drag-and-drop component with progress states

---

## Stage 4: Billing System — COMPLETE

- **Billing plans configuration**: Credit bundles (5/20/50/100) + subscription tiers (Starter/Professional/Studio/Enterprise)
- **Credit gate**: `checkAndDeductPackCredit()` — atomic deduction for credits mode, monthly counter for subscriptions, overage auto-purchase
- **Stripe Checkout** for credit purchases and subscription signups
- **Stripe Billing Portal** for card management
- **Webhook handler** for payment_intent.succeeded, invoice.payment_succeeded, subscription updates/deletions
- **Billing settings page** at `/app/settings/billing`:
  - Mode toggle (pay-per-pack vs subscription)
  - Credit balance with purchase cards
  - Subscription usage progress bar
  - Usage graph (last 6 months)
  - Billing history
- All pack generation routes gated through billing check
- 3 free credits seeded on org creation

---

## Stage 5: Report Builder & PDF Generation — COMPLETE

- **Report builder** (`web-app/src/components/report/ReportBuilder.tsx`):
  - Outcome selector from vertical config
  - Section list with progress tracking
  - AI-assisted drafting per section (never auto-accepted)
  - Section editor with markdown preview
  - Live A4 report preview pane
- **Server-side PDF generation** via Playwright adapter:
  - `POST /api/reports/[reportId]/generate-pdf`
  - HTML template with org branding (logo, colors, fonts)
  - A4 @page rules with proper margins
  - "Powered by Refrag" footer
- **Photo evidence PDF**: Each linked photo on its own page with caption, classification, timestamp
- **ZIP pack generation**: Collects all included items, calls billing gate, stores to Supabase Storage
- **HTML templates**: `web-app/src/lib/report/html-template.ts` and `photo-pdf-template.ts`

---

## Stage 6: Platform Event Instrumentation — COMPLETE

- `trackEvent()` client-side utility (fire-and-forget POST to /api/events/track)
- `trackServerEvent()` server-side utility (direct INSERT into platform_events)
- `useTrackEvent()` React hook
- 11 core events instrumented: user_logged_in, case_created, case_status_changed, document_dropped, evidence_uploaded, report_pack_created, report_pack_paid, invoice_created, comms_triggered, onboarding_step, onboarding_completed

---

## Stage 7: Mobile Upload Queue Migration — COMPLETE

- SQLite-backed upload queue: `mobile-app/src/lib/db/upload-queue.db.ts`
  - Replaces AsyncStorage implementation
  - Atomic transactions, no size limits, queryable
  - Crash recovery for stuck uploads
- Queue processor: Max 3 concurrent uploads, exponential backoff (30s → 2m → 10m → 30m)
- Background sync: AppState, NetInfo, foreground interval, expo-background-fetch
- React hook: `useUploadQueue()` with stats, items, enqueue, retry, clear
- UI component: `UploadQueueStatus` with badge and expandable panel

---

## Stage 8: Testing & Validation — COMPLETE

- **235 tests across 10 test files**:
  - Assessment calculator (46 tests) — multiple VAT rates, currency-agnostic
  - Label matcher (15 tests) — exact/fuzzy match, document roles
  - PII detector (18 tests) — international phone formats, emails, IDs
  - Text normalizer (17 tests) — OCR artifacts, whitespace
  - Credit gate (6 tests) — credits/subscription modes, audit logging
  - Comms trigger (7 tests) — template matching, placeholder resolution
  - Resolve placeholders (18 tests) — all tokens, multi-currency
  - Vertical config (57 tests) — all 5 verticals validated
  - Formatting utilities (30 tests) — multi-currency, multi-locale, edge cases
  - Error handling (21 tests) — from previous audit
- **International validation sweep** — All Part 20 rules verified:
  - No hardcoded R currency symbol
  - No POPIA references (configurable data_protection_regime)
  - No mm_code columns (identifier_type/identifier_value)
  - No AsyncStorage in upload queue (SQLite)
  - No client-side case number generation (server-side RPC)
  - No window.print() for reports (Playwright PDF)
  - No external API called inline (adapter pattern)
  - No PII sent to AI (sanitiser applied)
  - No hardcoded pricing
  - No if (vertical === 'motor') branching (config-driven)
  - All pack generation gated through billing
  - All comms sends logged
  - AI drafts require explicit acceptance

---

## External Configuration Required

These require manual setup — code is already wired with adapter fallbacks:

| Service | Env Var | Status |
|---------|---------|--------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Required |
| Google Cloud Vision | `GOOGLE_CLOUD_VISION_CREDENTIALS` | Optional (stub OCR active) |
| OpenAI | `OPENAI_API_KEY` | Optional (stub extraction active) |
| Resend | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Optional (dry-run mode active) |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_*_PRICE_ID_*` | Optional (stub active) |
| Playwright | `PLAYWRIGHT_EXECUTABLE_PATH` | Optional (PDFKit fallback active) |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional |

---

## File Structure (Key New Directories)

```
database/rebuild/
  001_master_schema.sql          — Complete rebuild schema
  002_rls_policies.sql           — All RLS policies

web-app/src/lib/
  verticals/config.ts            — VERTICAL_CONFIGS for all 5 verticals
  verticals/index.ts             — Helper functions
  adapters/                      — 7 adapter interfaces + implementations
  intake/                        — OCR pipeline (schemas, PII, label matcher, normalizer)
  billing/                       — Credit gate, plan configuration
  comms/                         — Trigger system, default templates, placeholders
  events/                        — Platform event tracking
  report/                        — HTML templates for PDF generation
  utils/formatting.ts            — Locale-agnostic formatting utilities

web-app/src/components/
  case/CaseWorkspace.tsx         — 5-tab vertical-driven workspace
  case/AccordionSection.tsx      — Reusable accordion
  case/sections/                 — 30 section components
  case/tabs/                     — 5 tab components
  report/ReportBuilder.tsx       — Report builder with AI draft
  report/ReportPreview.tsx       — Live A4 preview
  report/SectionEditor.tsx       — Section editor with AI
  mandate/                       — RequirementCard, RequirementGroup, ImportModal
  intake/                        — DocumentDropZone, ExtractionReviewPanel
  comms/                         — CommsTriggerPrompt, EmailPreviewPanel, CommsProvider

mobile-app/src/lib/
  db/upload-queue.db.ts          — SQLite-backed upload queue
  upload/                        — Queue processor, hooks, background sync
```
