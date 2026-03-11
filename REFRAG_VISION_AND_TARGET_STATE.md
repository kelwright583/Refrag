# Refrag — Vision & Target State

**Document Purpose:** Defines what Refrag needs to become — the end-state product for assessors, loss adjusters, and investigators. This is the authoritative target specification, informed by the MVP1 Governance document, strategic discussions, and insurer/assessor domain thinking.

**Document Date:** 2026-02-14  
**Document Version:** 2.0

---

## 1. Product Definition

### 1.1 What Refrag Is

Refrag is a **Case Operating System** for independent assessors, loss adjusters, and investigators. It consolidates fragmented workflows into a structured, auditable execution environment:

| Workflow | Refrag Role |
|----------|-------------|
| Email | Inbound: appointment emails create draft cases. Outbound: templated updates, report delivery, invoice sending. All logged. |
| Document capture | Instruction documents (PDF, email, scan) uploaded → OCR extraction → structured fields → human confirmation → case creation. |
| Valuation | On-demand valuation fetch via Lightstone adapter. Snapshot stored with provider + timestamp. No bulk caching. Supports motor + property. |
| Reporting | Structured report builder. HTML templates → PDF via server renderer. Exports versioned. Assessor Pack generation. |
| Transcription | Recordings uploaded → transcribed → transcript stored with consent flag. Attachable to report sections. |
| Invoicing | Invoice from case data + client rate profile. PDF generation. Email sending. Status tracking (sent, paid, overdue). |

### 1.2 What Refrag Does NOT Do

- **Replace professional judgement** — Refrag structures and orchestrates; the assessor decides. The system suggests, prompts, and reminds — it never forces a path.
- **Act as an insurer claims system** — Refrag is the assessor's operating environment, not the insurer's core.
- **Own third-party valuation datasets** — Data fetched on demand; Refrag holds provider contract, not bulk data.

### 1.3 What Refrag DOES Do

- **Orchestrate data** from multiple sources (email, documents, valuation APIs, recordings).
- **Structure workflows** so assessors spend less time on admin and more on assessment.
- **Produce defensible outputs** — reports, evidence bundles, invoices — with full audit trail.
- **Enable compliance and auditability** — every action logged, consent recorded, exports traceable.
- **Adapt to professional type** — motor assessor, property assessor, loss adjuster, investigator, or any combination.

---

## 2. Core Architecture Principles (Non-Negotiable)

1. **Multi-tenant isolation** — Strict org separation via Row Level Security.
2. **Every action logged** — `audit_log` table mandatory for key actions.
3. **No feature without structured data** — All features backed by schema, not free-floating PDFs.
4. **External data fetched on demand** — No bulk dataset storage; valuation, decode, etc. on request.
5. **All exports versioned and traceable** — Report versions, export history, transaction logs.
6. **Consent logging required** — Recordings must have consent flag before processing.
7. **Report generation only via structured case data** — No free-floating PDFs; reports built from case + evidence + mandate.
8. **Suggestive, not restrictive** — The system prompts and suggests based on available data; it never blocks the assessor from making their own professional determination.

---

## 3. Cross-Vertical Design (Motor, Property, Investigation)

### 3.1 Organisation Specialisation

At onboarding, the organisation selects its specialisation(s). Can select multiple:

- **Motor assessor** — Vehicle damage assessment
- **Property assessor** — Building and contents assessment
- **Loss adjuster** — Motor + property + contents + business interruption + all covers
- **Investigator** — Fraud, liability, general investigation
- **General / All** — Full capability

The selection shapes: UI flows, default mandate templates, field schemas, report templates, and valuation options surfaced.

### 3.2 Risk Items (Flexible Case Assets)

A case has one or more **risk items**. Each risk item represents something being claimed for under a specific cover type.

- **Primary risk item** is set at case creation (from instruction document or manual entry).
- **Additional risk items** can be added during assessment (e.g. on-site discovery of contents damage on a motor claim).

| Risk Item Type | Example Cover | Key Fields |
|----------------|---------------|------------|
| Motor vehicle | Comprehensive, third party | VIN, registration, make, model, year, engine number, mm_code |
| Building | Buildings cover | Address, erf number, municipal value, property type |
| Contents | Household contents | Description, estimated value |
| Stock | Stock & contents | Description, estimated value |
| Business interruption | Loss of income | Description, period, estimated loss |
| Goods in transit | Goods in transit | Description, value, route |

Risk item types drive:
- Which valuation to fetch (motor → vehicle valuation; property → property valuation)
- Which report sections are relevant
- Which OCR fields to extract
- Which mandate requirements apply

### 3.3 Future: AI-Assisted Risk Item Detection

From instruction documents, AI could determine what is being claimed for — but:
- **POPIA ring-fencing mandatory** — No PII (ID numbers, banking details) sent to AI.
- Only the relevant text section sent, not the entire document.
- MVP1: risk items entered manually or populated from OCR extraction. AI detection is a future enhancement.

---

## 4. Six Mandatory Pillars (MVP1)

### 4.1 Email

- **Inbound:** Appointment emails create draft cases. Parsed fields (insurer ref, insured name, address, etc.) stored. Human review before case creation.
- **Outbound:** Templated updates, report delivery, invoice sending via Resend. All communication logged in `comms_log`.

### 4.2 Document Intake & OCR (Google Vision)

#### Three Intake Channels

The instruction document can arrive in multiple formats. The UI presents three clear drop zones:

| Zone | Accepts | Processing |
|------|---------|------------|
| **Drop PDF here** | `.pdf` files (instruction documents, claim forms) | PDF text extraction or Vision OCR if scanned |
| **Drop email here** | `.eml` / `.msg` files (whole email with attachments) | Parse email body + extract attachments, then route attachments through PDF/image processing |
| **Scan / Take photo** | Camera capture or image upload (`.jpg`, `.png`) | Vision OCR on image |

The system detects the format and routes to the correct extraction pipeline.

#### OCR Pipeline

- **Flow:** Upload/drop → Store in Supabase Storage → Create `intake_document` record.
- **Extraction:** If PDF has text layer → extract directly. If scanned/image → Google Vision `document_text_detection`.
- **Structured pipeline:**
  1. Normalise text (line breaks, spacing, table artifacts).
  2. Rule-based extraction engine with global label dictionary.
  3. Regex extraction per field.
  4. Field confidence logic: exact match → high, fuzzy → medium, multiple candidates → low.
  5. Optional AI fallback only for missing/low-confidence fields (data minimised, POPIA compliant).
- **Human confirmation screen** — Before case creation, show extracted fields with confidence. User confirms or corrects. **Legally critical.**
- **Confidence scoring visible in UI** — Assessor sees which fields are high/medium/low confidence.
- **Multiple documents per case** — A case can have more than one instruction document (e.g. initial instruction, supplementary).

### 4.3 Valuation (Lightstone Adapter)

- **Lightstone** — Motor valuation + property valuation + depreciation models.
- Refrag holds provider contract. Fetch valuation on demand.
- Store valuation snapshot with provider + timestamp metadata in `valuation_snapshots`.
- `response_payload` stored as JSONB — flexible for motor and property responses.
- No bulk caching of provider data.
- **Integration with rule engine:** e.g. insurer writes off at 30% of retail → valuation fetched → repair estimate compared → system flags finding.

### 4.4 Transcription (Recordings First)

- Upload recording → Transcribe (OpenAI Speech-to-Text) → Store transcript with metadata.
- **Consent flag mandatory** — Must be recorded before processing.
- Transcript attachable to report sections.
- Supports meeting recordings and (future) in-app calls.

### 4.5 Reporting

- Structured report builder.
- HTML templates → PDF generation via server renderer (Playwright/Puppeteer).
- Exports versioned.
- Assessor Pack generation required (report + evidence bundle).
- **Report must accommodate multiple outcome paths** (see Section 6 — Write-Off Logic).

### 4.6 Invoicing

- Generate invoice from case data + client rate profile.
- Invoice PDF generation.
- Invoice email sending via Resend.
- Invoice status tracking (draft, sent, paid, overdue).

---

## 5. Report Pack Checkout Model (Revenue Layer)

- Subscription grants OS access.
- **Official Report Pack generation** triggers checkout.
- **Real Stripe integration** — Not mock. Live checkout from MVP1.
- **Pack types:**
  - Base Pack (report + evidence bundle)
  - + Valuation Enrichment
  - + Transcript Enrichment
- Checkout must:
  - Show selected enrichments
  - Calculate price clearly
  - Log transaction
  - Unlock export only after successful payment

---

## 6. Configurable Rule Engine (Assessor Firm → Client)

### 6.1 Concept

The assessor firm consolidates rules per client (insurer/broker). These are **decided at client onboarding** and drive valuation logic, report output, and mandate compliance.

Rules, mandates, and rate structures are **three separate concerns, all at client level:**

| Concern | Table | Purpose |
|---------|-------|---------|
| **Mandates** | `mandates` + `mandate_requirements` | Evidence checklist, required photos/docs |
| **Rate structures** | `client_rate_structures` | Billing rates (flat fee, hourly, per km) |
| **Rules** | `client_rules` | Write-off %, settlement basis, parts policy, labour rate |

### 6.2 Onboarding Questionnaire (Per Client)

Questions answered at client onboarding populate the rule engine:

| Rule | Purpose |
|------|---------|
| Approved labour rate | Report output, estimate calculations |
| Approved storage rate | Storage cost calculations |
| Write-off % | Threshold for uneconomical-to-repair (e.g. 30% of retail) |
| Settlement basis | Retail / Trade / Market value |
| Alternate vs OEM parts | Parts policy for estimates (OEM only / alternate allowed / mixed) |
| Structural write-off codes | Which SA vehicle codes (3, 3a, 4) trigger automatic write-off |
| Mandate-specific fields | Insurer questionnaires, model-specific requirements |

### 6.3 Rule Engine Outputs

- **Valuation integration:** Valuation API called → repair amount vs write-off threshold → suggest finding.
- **Report generation:** Labour rate, parts markup, settlement basis pulled from client rules.
- **Mandate compliance:** Insurer-specific requirements driven by client rules.

---

## 7. Write-Off Logic & Assessment Outcomes

### 7.1 Principle: Suggestive, Not Restrictive

The system suggests based on available data. It never forces the assessor into a path. If data is present, offer calculations and pre-filled recommendations. If data is missing, remind the assessor which sections need attention.

### 7.2 Outcome Paths

| Scenario | Trigger | System Response |
|----------|---------|-----------------|
| **Economic write-off** | Repair estimate exceeds client's write-off % of value | Banner: "This may be uneconomical to repair based on [Client]'s threshold of X%. Repair R45,000 vs threshold R42,000." Actions: "Update report recommendation" / "Advise repairer" / "Dismiss" |
| **Structural write-off** (Code 3 / 3a / 4) | Assessor identifies structural damage classification during assessment | Flag structural code; economics irrelevant for these. Suggest appropriate report language. Report template adapts. |
| **Repairer declines to quote** | No estimate available — repairer knows it's impractical | Assessor notes reason; report accommodates absence of estimate. System does not block for missing estimate. |
| **Normal repair** | Estimate within threshold, no structural issues | Standard repair recommendation flow |

### 7.3 "Advise Repairer" Flow

When assessor clicks "Advise repairer":
- Opens comms template pre-filled for the panelbeater/repairer contact.
- Logged in `comms_log`.

### 7.4 "Update Report Recommendation" Flow

When assessor clicks "Update report recommendation":
- Report recommendation section gets pre-filled note about the finding (write-off, structural, etc.).
- Assessor can edit before saving.

---

## 8. Instruction Document Field Schema (OCR Target)

### 8.1 Global Label Dictionary (MVP1)

Fields to extract from instruction documents. Global dictionary — not per-insurer for MVP1.

**Common fields (all verticals):**

| Field | Example Labels |
|-------|----------------|
| `insurer_reference` | Claim Number, Claim Ref, SEB Claim Number, Reference, Our Ref |
| `policy_number` | Policy No, Policy Number, Pol No |
| `date_of_loss` | Date of Loss, DOL, Loss Date |
| `insured_name` | Insured, Policyholder, Insured Name |
| `contact_phone` | Phone, Contact Number, Cell |
| `insurer_name` | Insurer, Underwriter |
| `cover_type` | Cover Type, Comprehensive, Third Party |
| `appointment_date` | Appointment, Inspection Date, Assessment Date |
| `loss_address` | Address, Loss Address, Location |

**Motor-specific fields:**

| Field | Example Labels |
|-------|----------------|
| `vehicle_registration` | Registration, Reg No, Licence Plate |
| `vin` | VIN, Chassis Number, Chassis No |
| `engine_number` | Engine No, Engine Number |
| `mm_code` | MM Code, Make/Model Code |
| `vehicle_make` | Make |
| `vehicle_model` | Model |
| `vehicle_year` | Year, Year of Manufacture |

**Property-specific fields:**

| Field | Example Labels |
|-------|----------------|
| `property_address` | Property Address, Premises, Risk Address |
| `erf_number` | Erf Number, Erf No, Stand Number |
| `property_type` | Property Type, Building Type |

*The label dictionary is the assessor's IP — not the OCR call itself.*

### 8.2 Long-Term: Insurer-Specific Parser Presets

- Layout fingerprint to auto-detect insurer template.
- Per-insurer label dictionaries for improved accuracy.
- Track extraction accuracy per insurer; improve over time.
- Target: 90–95% extraction on known insurers.

---

## 9. UX Guardrails

- No more than 5 bottom tabs in mobile.
- No unnecessary modal clutter.
- Defaults configurable at org level.
- Reporting and checkout must feel professional, not transactional.
- **Every automation must remove a manual step** — assessor time is the scarce resource.
- **Suggestive, not restrictive** — If inputs exist, offer suggestions. If not, remind. Never block.

---

## 10. Ease of Use (Assessor / Loss Adjuster / Investigator Lens)

### 10.1 What "Simple" Means

- **Case creation in under 60 seconds** — From instruction upload to draft case.
- **Report in under 5 minutes** — Once data is captured, report generation is fast.
- **Invoice without re-entry** — Generated from case + client rates; no manual amount entry.
- **One place for everything** — Email, documents, valuation, recordings, reports, invoices in one system.
- **Minimal clicks** — Upload → confirm → case. No redundant steps.
- **Confidence visible** — Assessor knows what to double-check (low-confidence fields).
- **Three intake channels** — PDF, email, scan. Clear, guided, no confusion about where to put what.

### 10.2 Insurer / Assessor Firm Perspective

- **Mandate compliance** — Mandate requirements drive checklist; evidence linked; report reflects mandate.
- **Audit trail** — Every action logged; exports versioned; consent recorded.
- **Client-specific rules** — Labour rate, write-off %, settlement basis per client; no manual lookup.
- **Defensible outputs** — Reports and evidence bundles structured for insurer review.
- **Risk items per case** — Multiple items under different covers, all tracked.

---

## 11. External API Stack (MVP1)

| API | Purpose |
|-----|---------|
| Resend | Outbound email |
| Google Cloud Vision | OCR extraction |
| OpenAI Speech-to-Text | Transcription |
| Lightstone | Motor valuation, property valuation, depreciation, decode |
| Stripe | Checkout processing (Report Pack) |
| Playwright/Puppeteer | PDF generation |

*No additional APIs without documented business case.*

---

## 12. Compliance & Data Protection

- Refrag acts as **Data Processor**.
- Encryption at rest and in transit required.
- Role-based access control mandatory.
- Retention settings configurable per organisation.
- Data export + delete capability required.
- AI processing must be transient and documented (minimal AI exposure; rule-based first).
- **POPIA ring-fencing** — No PII sent to AI. Only relevant text sections, not full documents.

---

## 13. Success Criteria (MVP1)

- [ ] A case can be created from instruction document in under 60 seconds.
- [ ] Three intake channels work: PDF drop, email drop, scan/photo.
- [ ] OCR extracts fields with confidence; human confirms before case creation.
- [ ] A report can be generated in under 5 minutes once data is captured.
- [ ] An invoice can be generated from the case without re-entry.
- [ ] All actions logged.
- [ ] Report Pack checkout via Stripe is operational.
- [ ] Valuation on demand (Lightstone) with snapshot storage.
- [ ] Recording → transcription → transcript in case and report.
- [ ] Write-off logic suggests findings (economic, structural, no-estimate).
- [ ] Risk items tracked per case (primary + additional).
- [ ] Organisation specialisation shapes UI and available features.

---

## 14. Long-Term Evolution

- **Insurer-specific parser presets** — Layout fingerprint to auto-detect insurer template.
- **Extraction accuracy tracking** — Per insurer, improve label dictionary over time.
- **90–95% extraction** on known insurers with iterative refinement.
- **AI-assisted risk item detection** — Determine claim type from instruction text (POPIA ring-fenced).
- **Insurer-specific questionnaires** — Fillable fields per model for mandate compliance.
- **In-app calls** — Twilio integration with recording and transcription.

---

**Document Version:** 2.0  
**Last Updated:** 2026-02-14
