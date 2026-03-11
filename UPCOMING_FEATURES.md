# Upcoming Features & Notes

Captured 5 March 2026. These are the next items to spec, design, and build after Phase 7 OCR wiring is complete.

---

## Priority 1 — Org Stationery & Branding (Phase 15)

### Intent
Assessors and investigators generate reports, invoices, and eventually investigation reports that go to insurers and clients. These documents must look entirely like **their own company's output** — not Refrag's. Refrag's presence is a single, tiny "Powered by Refrag" note in the footer, nothing more.

### What needs to be built

#### Stationery Settings page (`/app/settings/stationery`)
A dedicated branding settings section separate from the general assessment settings:

**Logo**
- Upload logo (PNG/JPG/SVG, max 2 MB)
- Stored in Supabase Storage bucket `org-assets`
- Preview shown inline after upload
- Logo appears on: assessment reports, invoices, report pack cover page (future)

**Colours**
- The user chooses 3 colours:
  - **Primary colour** — main headings, section borders, header background
  - **Accent colour** — buttons, highlights, table header backgrounds
  - **Text colour** — body text on documents (usually near-black)
- Each colour picker:
  - Hex input (manual entry — so they can type exact brand hex)
  - A small colour swatch picker for those who don't know hex
  - AI option: "Detect from logo" — upload logo → GPT-4o Vision reads dominant and secondary colours → suggests hex values → user confirms or adjusts
- A **live preview** panel shows a miniature version of the report header and an invoice header updating in real time as colours change

**Document footer text**
- "Powered by Refrag" is always included in 7pt grey text — not editable, not removable
- But they can add their own disclaimer / registration number / terms below their signature block

**Preview pages**
- Two preview tabs: **Report Preview** and **Invoice Preview**
- These are small (~A5 thumbnail) renders showing how the current stationery settings will look on each document type
- A "Print sample" button that generates a one-page sample PDF

### Where branding is applied
- `AssessmentReport.tsx` — header, section title borders, footer
- Invoice component (to be built or updated) — header, line item table header
- Report pack cover page (Phase 8 rewrite)

### Schema additions needed
Add to `org_settings` (or create `org_stationery` table):
```sql
logo_url text,
primary_colour text,  -- hex e.g. "#C9663D"
accent_colour text,
text_colour text,
stationery_updated_at timestamptz
```

### "Powered by Refrag" policy
- **Always present** on every document output
- Font size: 7pt, colour: `#9CA3AF` (light grey)
- Position: very bottom of footer, centred or right-aligned
- Text: `Powered by Refrag · refrag.app`
- Non-removable in UI — any attempt to override via CSS is watermarked at PDF generation level

---

## Priority 2 — Report Pack Completion (Phase 7 extension)

### Intent
The Report Pack is the assessor's complete deliverable to the insurer. It should be a single, professional ZIP or PDF containing everything the claims technician needs.

### Current state
The Report Pack UI exists at `/app/cases/[id]/report`. It lists items from `report_pack_items` and allows toggling them in/out. Download ZIP and Email buttons are stubbed.

### What needs to be completed

#### 1. Photos as a separate PDF attachment
- Linked photos from `report_evidence_links` (attached via PhotosEvidenceTab) should be compiled into a **Photo Evidence PDF**
- Each photo fills one page with: the image, a caption, the AI-assigned tag (category label from classify-evidence), the section it was linked to (e.g. "Left Side Damage"), and the upload timestamp
- This PDF is added as a separate item in the report pack alongside the assessment report
- **Requirement**: photos should have been AI-classified first — the Pack creation flow should warn if any linked photos have not been AI-classified yet and offer to run classification before generating

#### 2. Assessor's invoice in the pack
- The report pack should include the assessor's invoice as a line item
- Before generating/finalising a pack, the system checks if an invoice exists for this case
- If no invoice: show a banner — "You haven't created an invoice for this case. Create one now before generating the pack" with a "Create Invoice" shortcut
- If invoice exists: it appears as a selectable item in the pack list (toggle in/out)

#### 3. Download as ZIP
- Wire the "Download as ZIP" button
- Contents: `[CaseRef]_Assessment_Report.pdf`, `[CaseRef]_Photo_Evidence.pdf`, `[CaseRef]_MM_Valuation.pdf` (the original uploaded doc), `[CaseRef]_Parts_Quote.pdf`, `[CaseRef]_Repairer_Quote.pdf`, `[CaseRef]_Invoice.pdf`
- Only include items toggled as "included" in the pack
- Use `jszip` on the client or a server route

#### 4. Email to Insurer
- Wire the "Email to Insurer" button using the Resend integration (see Priority 6)
- Uses `insurer_email` from the assessment's instruction details
- Attaches the pack documents
- Uses a comms template (e.g. "Assessment Complete — {CaseRef}")

---

## Priority 3 — Google Cloud Vision OCR Setup

### When you're ready to set this up, here are the steps:

#### Step 1 — Create a Google Cloud project
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Name it e.g. `refrag-ocr`

#### Step 2 — Enable the Vision API
1. In the project, go to **APIs & Services → Library**
2. Search for "Cloud Vision API"
3. Click **Enable**

#### Step 3 — Create a service account
1. Go to **IAM & Admin → Service Accounts**
2. Click **Create Service Account**
3. Name it e.g. `refrag-vision-reader`
4. Grant role: **Cloud Vision API Service Agent** (or `roles/visionai.serviceAgent`)
5. Click **Done**

#### Step 4 — Create and download credentials
1. Click on the new service account
2. Go to **Keys** tab → **Add Key → Create new key → JSON**
3. Save the downloaded JSON file — this is your credentials file

#### Step 5 — Add to environment variables
In `web-app/.env.local`:
```
GOOGLE_CLOUD_VISION_CREDENTIALS={"type":"service_account","project_id":"..."}
```
Or reference the path:
```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

#### Step 6 — Install the SDK
```bash
cd web-app
npm install @google-cloud/vision
```

#### Step 7 — Wire into ingest-document route
The `/api/ai/ingest-document/route.ts` currently uses `pdf-parse` for PDFs and `mammoth` for Word docs. For scanned images and scanned-PDF images, replace the image path with:
```typescript
const vision = require('@google-cloud/vision')
const client = new vision.ImageAnnotatorClient()
const [result] = await client.documentTextDetection(buffer)
const text = result.fullTextAnnotation?.text ?? ''
```
This gives much higher accuracy on printed/scanned insurance documents than GPT-4o Vision alone.

#### Cost note
Google Vision API: $1.50 per 1,000 pages. At typical volumes (a few hundred assessments/month), this is negligible. GPT-4o is still used for classification and structured field extraction after OCR — Vision just handles the raw text extraction.

---

## Priority 4 — Onboarding Review

### Issues identified
The current onboarding flow (if any) was built early and needs a full rethink given how the product has evolved. Key gaps:

1. **No guided setup** — new orgs don't know they need to configure assessment settings (labour rates, approved repairers, stationery) before the system produces sensible outputs
2. **No stationery setup step** — branding should be configured on first login
3. **No sample data** — would help new users see how the system works without creating real cases first
4. **No walkthrough** — the UI has a lot of tabs and sections; new users need some orientation

### What to build
- A **setup wizard** triggered on first login for a new organisation
- Steps: 1) Upload logo + set colours → 2) Set org details (reg number, VAT number, contact) → 3) Set financial defaults (max repair %, VAT rate, labour rates) → 4) Add at least one approved repairer → 5) Done — create first case
- A **"Getting Started" checklist card** on the dashboard that persists until all setup steps are complete
- This is a separate design and build session — needs wireframing first

---

## Priority 5 — Investigator Tool (Next MVP)

### What is it?
Assessment and investigation are fundamentally different workflows:

| Assessment | Investigation |
|---|---|
| Assessor goes to a vehicle/property | Investigator interviews people, visits scenes, reviews documents |
| Produces an assessment report with repair/write-off recommendation | Produces an investigation report with findings, red flags, fraud indicators, recommendation to accept/reject/refer |
| Tied to a specific risk item (vehicle, property) | Tied to a claim/case but may span multiple risk items and parties |
| Output: structured financial + technical data | Output: narrative-heavy report with evidence annexures |
| Client: the assessor firm | Client: the investigator firm (SIU, forensic, legal) |

### Key differences to design in
- Different case types and flows — investigation cases vs assessment cases
- Different "tabs": instead of Vehicle/Tyres/Damage, you might have: **Incident Details**, **Parties & Statements**, **Document Review**, **Site Visit**, **Red Flags**, **Findings & Recommendation**
- Different financials — investigators don't calculate repair costs; they may log their own time/fees
- Different report format — narrative report with numbered findings, evidence annexure, legal disclaimers
- **Mandate templates** become **investigation checklists** (e.g. SIU mandate requirements)
- The mobile app field capture already works for investigations (photos, notes, docs) but the web UI needs a parallel set of tabs

### Next steps
- Deep-dive session to map the exact workflow an investigator follows on a typical claim
- Design the data schema for investigation-specific data
- Create a new phase (Phase 16) in the build plan with full spec

---

## Priority 6 — Resend Email / Comms Integration (Phase 17)

### Intent
Replace the stub email functionality throughout the system with real transactional email via [Resend](https://resend.com) — a modern, developer-friendly email API with excellent deliverability.

### What to build

#### Setup
1. Sign up at resend.com, get API key
2. Add to `.env.local`: `RESEND_API_KEY=re_xxxxx`
3. Install: `npm install resend`
4. Configure sending domain (requires DNS records — your own domain e.g. `@refrag.app` or the assessor's domain)
5. Create `/api/comms/send` route that accepts `{ to, template_id, case_id, assessment_id? }` and resolves template placeholders against live case/assessment data before sending

#### Email templates (build in Resend dashboard + mirror in app)
- **Assessment Instruction Received** — auto-sent when a new case is created from an ingested document
- **Assessment Complete** — sent to insurer with report pack attached or linked
- **Write-off Notification** — specific template for write-off outcomes
- **Request for Additional Information** — when assessor needs more from insurer
- **Invoice** — invoice email with PDF attached
- **Report Pack Delivery** — formal delivery with all attachments listed

#### In-app comms tab (`/app/cases/[id]/comms`)
The comms tab already has a log structure. Wire it up so:
- Every sent email is logged automatically
- Manual log entries (phone calls, WhatsApp messages) can still be added
- Template picker → preview with resolved placeholders → send → auto-logged
- Status tracking (sent, opened — if Resend webhooks configured)

#### POPIA note
- Email addresses (insurer, client, broker) are PII — only use them for explicit communication, never for AI processing
- Log what was sent, not the full body — or encrypt the body in comms_log
- Opt-out mechanism for clients must be considered before go-live
