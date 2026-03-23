# Refrag — Manual Testing Flows

Run these flows end-to-end before each release. All flows assume a clean test org with Supabase connected.

---

## Flow 1 — Motor Assessor End-to-End

**Goal:** Verify the complete motor assessor workflow from case creation to report delivery.

1. Log in as a motor assessor org
2. Create a new case: client name, insurer, claim reference, loss date, priority = High
3. Verify case number is generated server-side (not client-side)
4. Open the case — confirm Overview tab shows InstructionDetailsSection with the entered data
5. Open Capture tab → Evidence Grid → upload 3 photos using drag-and-drop
6. Tag each photo (VIN, FRONT, DAMAGE_CLOSEUP)
7. Open Capture tab → Valuation Drop → drag a PDF — confirm it uploads and shows the document log entry
8. Open Assessment tab → Damages/Labour section → add 3 line items with labour hours and paint cost
9. Open Assessment tab → Parts section → add OEM and aftermarket parts
10. Open Assessment tab → Tyres section → enter readings for all 4 positions
11. Open Assessment tab → Vehicle Values section → enter retail, trade, market values with source
12. Open Report tab → Report Builder → verify all 15 sections are visible for motor_assessor vertical
13. Click AI Draft on the Damage Description section — verify draft appears and is not auto-accepted
14. Accept the draft, edit it, mark section complete
15. Complete all required sections
16. Click Generate PDF — verify PDF downloads and contains org branding
17. Open Pack & Invoice tab → Pack Builder → select Assessment Report + Photo Evidence PDF → Generate Pack
18. Verify credit deducted (check billing settings)
19. Click Email Report → enter a test email → Send — verify dry-run log entry in comms_log if Resend not configured, or actual delivery if configured
20. Open Pack & Invoice tab → Invoice Builder → add 2 line items → Save Invoice → Download PDF

**Pass criteria:** All steps complete without errors. PDF is formatted correctly. Invoice number comes from server (not "INV-PENDING" after save).

---

## Flow 2 — Investigator End-to-End

**Goal:** Verify the investigator vertical works from referral through to report.

1. Log in as an investigator org
2. Create a new case with vertical = investigator
3. Confirm the extended fields appear: referral source, nature of referral, confidentiality level
4. Open the case — confirm Overview tab shows ReferralDetailsSection and PartiesSummarySection
5. Add 2 parties (Insured, Witness) with contact details
6. Open Capture tab → upload 2 documents as statements
7. Open Assessment tab → Findings List → add 3 findings (High/Medium/Low severity), link evidence to each
8. Open Assessment tab → Red Flags → add 2 red flags, link to findings
9. Open Assessment tab → Investigation Timeline → add 4 entries (site visit, interview × 2, document review)
10. Open Assessment tab → Parties & Statements → mark Insured as "Interview conducted" and "Sworn statement obtained"
11. Open Assessment tab → Time & Disbursements → add 3 time entries and 2 disbursements
12. Verify the financial summary auto-calculates correctly
13. Open Report tab → Report Builder → confirm investigator sections appear: Mandate, Methodology, Parties, Findings, Evidence Annexure, Red Flag Summary, Outcome, Declaration
14. Verify Evidence Annexure auto-populates from uploaded evidence (no AI draft button)
15. Sign the declaration using the signature pad — verify signature image appears
16. Generate PDF — verify it contains all sections and the signature
17. Open Pack & Invoice tab → Invoice Builder → click "Import from Time & Disbursements" → verify line items populated
18. Save invoice → verify invoice number is server-generated

**Pass criteria:** All investigator-specific sections render and save. Signature is captured and persists.

---

## Flow 3 — PWA Field Flow

**Goal:** Verify the PWA field experience works on a real mobile device (test on Chrome Android and Safari iOS).

1. Open `https://[your-app-url]/app/field/dashboard` on a mobile browser
2. Verify the bottom navigation bar renders with 5 tabs
3. Verify "Add Refrag to your home screen" banner appears (first visit only)
4. Add to home screen and reopen — verify it launches in standalone mode (no browser chrome)
5. Navigate to Cases tab — verify case list loads
6. Open a case — verify all 4 tabs (Overview, Evidence, Mandate, Notes) are present
7. Navigate to Capture tab
8. Tap "Take Photo" — verify rear camera opens directly (not gallery)
9. Take 2 photos, select a case, add tags (VIN, FRONT), add a note
10. Tap "Queue for upload" — verify queued confirmation appears
11. Verify the upload queue status banner appears showing "2 files uploading in background"
12. Turn off WiFi and mobile data
13. Verify the case list still shows (cached data)
14. Verify the cached data banner ("Showing cached data from X") appears on case detail
15. Restore connectivity — verify uploads complete and the status banner disappears
16. Navigate to Calendar tab — verify today's appointments show (or "No appointments today")
17. Navigate to Profile tab — verify "Switch to Desktop" link works

**Pass criteria:** PWA installs correctly. Camera works. Queue survives offline. Cached data shown when offline.

---

## Flow 4 — Multi-Tenant Isolation (Security)

**Goal:** Verify Org A cannot access Org B's data.

1. Create two test organisations (Org A and Org B) with separate user accounts
2. As Org A: create a case and note its UUID from the URL
3. Log out and log in as Org B
4. Attempt to access `https://[your-app-url]/app/cases/[Org-A-case-UUID]` directly
5. **Expected:** 404 or redirect to dashboard — never the case data
6. Attempt `GET /api/cases/[Org-A-case-UUID]` with Org B's session cookie
7. **Expected:** 404 or empty response — never Org A's data
8. As Org B: create evidence and note its storage path
9. Attempt to construct a signed URL for Org A's evidence using Org B's session
10. **Expected:** Supabase RLS blocks the query — no signed URL issued

**Pass criteria:** Cross-org data is never exposed at any layer (UI, API, or storage).
