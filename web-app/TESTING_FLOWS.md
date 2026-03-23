# Refrag — Manual E2E Testing Flows

This document covers critical end-to-end flows to verify before releasing to production.
Run these flows against a staging environment with real Supabase data.

---

## 1. Case Creation

1. Sign in as an assessor with an active organisation.
2. Navigate to the Cases dashboard (`/app/cases`).
3. Click **New Case** (or equivalent CTA).
4. Fill in all required fields: insured name, vehicle registration, claim reference, and incident date.
5. Submit the form.
6. Verify the case appears in the cases list with status **Draft**.
7. Click into the case and confirm all submitted fields are displayed correctly.

---

## 2. Evidence Upload

1. Open an existing case in **Draft** or **In Progress** status.
2. Navigate to the **Evidence** tab.
3. Click **Upload Evidence** and select one or more image files from disk.
4. Confirm the upload progress indicator appears and completes without error.
5. Verify each uploaded image appears as a thumbnail in the evidence grid.
6. Click a thumbnail to open the lightbox/detail view and confirm the file is accessible.
7. Check that file metadata (name, size, upload timestamp) is shown correctly.

---

## 3. Field App (PWA)

1. Open the field app URL (`/app/field/` or the standalone PWA route) on a mobile browser (Chrome for Android or Safari on iOS).
2. Accept any camera/location permission prompts.
3. Install the PWA: tap **Add to Home Screen** when prompted, or use the browser menu.
4. Launch the installed PWA from the home screen and confirm it opens in standalone mode (no browser chrome).
5. Select an assigned case from the field case list.
6. Tap **Capture Photo**, take a photo, and confirm it appears in the capture review screen.
7. Add optional notes and tags, then tap **Save**.
8. Verify the captured item appears in the local upload queue (badge count or queue screen).
9. With a network connection, confirm the item uploads and the queue clears.

---

## 4. Assessment

1. Open a case and navigate to the **Assessment** tab.
2. Click **Edit** (or the tab activates an editable form directly).
3. Fill in vehicle details: make, model, year, VIN, colour, mileage, and condition rating.
4. Add at least one line item with parts cost, labour hours, and labour rate.
5. Click **Save**.
6. Reload the page and verify all saved values persist.
7. Confirm line item totals and the repair subtotal are recalculated correctly on reload.

---

## 5. Report Generation

1. Open a case with a completed assessment (all required fields populated).
2. Navigate to the **Report** tab.
3. Click **Build Report** to generate the report draft.
4. Verify the report preview renders with correct vehicle details, line item table, and financial summary.
5. Click **Generate PDF**.
   - If PDF generation is live: confirm the file downloads and opens correctly.
   - If PDF generation is stubbed: confirm the stub message or toast is displayed without error.
6. Check that the report record is saved against the case (report status shows **Generated** or equivalent).

---

## 6. Invoice

1. Open a case with a completed report.
2. Navigate to the **Invoice** tab.
3. Click **Create Invoice**.
4. Verify the invoice pre-populates with line items from the assessment.
5. Confirm VAT calculation is correct (e.g., 15% of subtotal equals the displayed VAT amount).
6. Add or adjust any line items and confirm totals recalculate.
7. Click **Send Invoice** (or **Dry Run** if no live email/payment integration is configured in staging).
   - If live: confirm invoice email is dispatched and invoice status updates to **Sent**.
   - If dry run: confirm the action completes without error and a success message is shown.

---

## 7. Mandate Checklist

1. Open a case and navigate to the **Mandate** tab.
2. Click **Assign Mandate** and select a mandate template from the list.
3. Confirm the mandate's requirement checklist renders with all items unchecked.
4. Check off two or more requirements and save.
5. Reload the page and verify the checked items remain ticked.
6. Complete all items and verify the mandate status updates to **Complete** (or equivalent indicator).

---

## 8. Offline Mode

1. Open a case detail page and let all assets finish loading.
2. Open browser DevTools → Network tab → set throttling to **Offline** (or disable the device's Wi-Fi/mobile data).
3. Reload the page.
4. Verify the cached case data renders without a blank screen or unhandled error (service worker or React Query cache should serve stale data).
5. Navigate between tabs within the cached case — verify that locally-cached content (assessment details, evidence thumbnails) remains accessible.
6. Attempt to capture a photo via the field app or upload a file. Confirm the item is queued locally with a **Pending** status rather than failing outright.
7. Re-enable the network connection.
8. Verify the upload queue processes automatically and the queued item transitions to **Uploaded**.
9. Confirm the synced evidence or data appears correctly in the case.
