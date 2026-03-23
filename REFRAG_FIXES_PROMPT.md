# REFRAG — TARGETED FIXES PROMPT
**Version:** 1.0  
**Purpose:** Apply the specific fixes identified in the post-build audit. Every task in this document is precise and surgical — do not refactor beyond what is described. Read the existing file before editing it. Verify each change compiles before moving to the next task.

---

## CONTEXT — WHAT THIS PROMPT FIXES

A full audit of the codebase identified the following gaps after the main build was completed:

1. **Field upload queue processor missing** — `field-upload-queue.ts` (IndexedDB store) exists but has no processor to actually send queued items to the API. The capture page also bypasses the queue entirely and calls the upload API directly, defeating the offline-resilience design.
2. **Field case detail evidence tab also bypasses the queue** — same direct-upload problem as the capture page.
3. **Zod validation missing from 61 API routes** — security gap; unvalidated input reaches the database.
4. **`@sparticuz/chromium` and `puppeteer-core` not in `package.json`** — the PDF adapter at `web-app/src/lib/adapters/pdf.ts` already imports them with `@ts-expect-error` dynamic imports, but they are not installed as dependencies, so PDF generation will fail in production.
5. **Signature pad not wired into the report or the field case detail** — `SignaturePad.tsx` exists and is imported in `ReportBuilderSection.tsx` but the actual UI and save logic are missing.
6. **`TESTING_FLOWS.md` missing** — manual QA document not created.
7. **Accessibility gaps** — zero `aria-label` attributes on icon-only buttons in case section components.

---

## TASK 1 — CREATE THE FIELD QUEUE PROCESSOR

**Create this file:** `web-app/src/lib/upload/field-queue-processor.ts`

This is a new file. Create it with the exact content below. Do not modify any existing files as part of this task.

```typescript
/**
 * Field Queue Processor
 *
 * Reads pending items from the IndexedDB upload queue and POSTs them to
 * /api/evidence/[caseId]/upload. Runs in the browser only.
 *
 * Rules:
 *  - Max 3 concurrent uploads
 *  - Exponential back-off: 30 s → 2 min → 10 min → 30 min (max 4 retries)
 *  - Blob URLs that are inaccessible are marked failed immediately
 *  - Activates on: page visibility restored, network online, 30 s interval
 */

import {
  getByStatus,
  updateStatus,
  remove,
  type QueueItem,
} from './field-upload-queue'

const MAX_CONCURRENT = 3
const MAX_RETRIES = 4

/** Delays in ms indexed by retryCount (0-based after first failure) */
const BACKOFF_MS = [30_000, 120_000, 600_000, 1_800_000]

/** Item IDs currently being uploaded — prevents double-processing */
const inFlight = new Set<string>()

// ── Helpers ───────────────────────────────────────────────────────────────────

async function isBlobAccessible(uri: string): Promise<boolean> {
  if (!uri.startsWith('blob:')) return true
  try {
    const res = await fetch(uri, { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

async function uploadItem(item: QueueItem): Promise<void> {
  const accessible = await isBlobAccessible(item.localFileUri)
  if (!accessible) {
    await updateStatus(item.id, 'failed', 'File no longer available — please recapture')
    return
  }

  await updateStatus(item.id, 'uploading')

  try {
    const blobRes = await fetch(item.localFileUri)
    const blob = await blobRes.blob()
    const file = new File([blob], item.fileName, { type: item.contentType })

    const fd = new FormData()
    fd.append('file', file)
    fd.append('media_type', item.mediaType)
    fd.append('tags', JSON.stringify(item.tags))
    fd.append('notes', item.notes)
    fd.append('captured_at', item.capturedAt)
    if (item.locationLat != null) fd.append('location_lat', String(item.locationLat))
    if (item.locationLng != null) fd.append('location_lng', String(item.locationLng))

    const res = await fetch(`/api/evidence/${item.caseId}/upload`, {
      method: 'POST',
      body: fd,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(err.error ?? `HTTP ${res.status}`)
    }

    await updateStatus(item.id, 'uploaded')
    // Remove from queue 5 s after success (keeps the UI confirmation visible briefly)
    setTimeout(() => remove(item.id).catch(() => {}), 5_000)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    const nextRetry = (item.retryCount ?? 0) + 1

    if (nextRetry > MAX_RETRIES) {
      await updateStatus(item.id, 'failed', `Max retries exceeded: ${message}`)
    } else {
      await updateStatus(item.id, 'pending', message)
    }
  }
}

// ── Main processor ────────────────────────────────────────────────────────────

let processorRunning = false

export async function runQueueProcessor(): Promise<void> {
  if (processorRunning) return
  if (typeof window === 'undefined') return // SSR guard

  processorRunning = true

  try {
    // Reset any items that were left stuck in 'uploading' (e.g. tab closed mid-upload)
    const stuckItems = await getByStatus('uploading')
    await Promise.all(
      stuckItems
        .filter((item) => !inFlight.has(item.id))
        .map((item) => updateStatus(item.id, 'pending', 'Requeued after interruption'))
    )

    const pendingItems = await getByStatus('pending')
    const eligible = pendingItems.filter((item) => !inFlight.has(item.id))
    const slots = eligible.slice(0, MAX_CONCURRENT - inFlight.size)

    if (slots.length === 0) return

    await Promise.allSettled(
      slots.map(async (item) => {
        inFlight.add(item.id)
        try {
          await uploadItem(item)
        } finally {
          inFlight.delete(item.id)
        }
      })
    )
  } finally {
    processorRunning = false
  }
}

// ── Lifecycle — call startQueueProcessor() once from a client component ───────

let lifecycleStarted = false
let intervalId: ReturnType<typeof setInterval> | null = null

export function startQueueProcessor(): () => void {
  if (lifecycleStarted || typeof window === 'undefined') return () => {}
  lifecycleStarted = true

  // Run immediately on mount
  runQueueProcessor()

  // Poll every 30 s while the page is visible
  intervalId = setInterval(() => {
    if (!document.hidden) runQueueProcessor()
  }, 30_000)

  const onVisibility = () => {
    if (!document.hidden) runQueueProcessor()
  }
  const onOnline = () => runQueueProcessor()

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('online', onOnline)

  return () => {
    if (intervalId) clearInterval(intervalId)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('online', onOnline)
    lifecycleStarted = false
    intervalId = null
  }
}
```

---

## TASK 2 — REWRITE THE FIELD CAPTURE PAGE TO USE THE QUEUE

**File to rewrite:** `web-app/src/app/field/capture/page.tsx`

The current file calls `useUploadEvidence().mutateAsync()` directly, bypassing the IndexedDB queue. Replace the entire file content with the following. Do not keep any of the old upload logic.

```typescript
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, ImageIcon, FileText, MapPin, X, Upload, Check, CloudOff } from 'lucide-react'
import { useCases } from '@/hooks/use-cases'
import { useFieldUploadQueue } from '@/hooks/use-field-upload-queue'
import { startQueueProcessor } from '@/lib/upload/field-queue-processor'
import type { Case } from '@/lib/types/case'

const PRESET_TAGS = [
  'FRONT', 'REAR', 'LEFT', 'RIGHT', 'VIN', 'ODOMETER', 'UNDERCARRIAGE',
  'ENGINE', 'INTERIOR', 'CHASSIS', 'DAMAGE_CLOSEUP', 'DAMAGE_WIDE',
  'STATEMENT', 'QUOTE', 'INVOICE',
] as const

interface PreviewFile {
  file: File
  previewUrl: string
  isImage: boolean
}

interface GeoLocation {
  lat: number
  lng: number
}

export default function FieldCapturePage() {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  const [previews, setPreviews] = useState<PreviewFile[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [customTag, setCustomTag] = useState('')
  const [notes, setNotes] = useState('')
  const [geoStatus, setGeoStatus] = useState<'idle' | 'capturing' | 'success' | 'failed'>('idle')
  const [geoLocation, setGeoLocation] = useState<GeoLocation | null>(null)
  const [queueStatus, setQueueStatus] = useState<'idle' | 'queued' | 'error'>('idle')
  const [queueError, setQueueError] = useState<string | null>(null)

  const { data: allCases = [] } = useCases()
  const { enqueue, stats } = useFieldUploadQueue()

  // Start queue processor once on mount
  useEffect(() => {
    return startQueueProcessor()
  }, [])

  // Capture GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) { setGeoStatus('failed'); return }
    setGeoStatus('capturing')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoStatus('success')
      },
      () => setGeoStatus('failed'),
      { timeout: 10_000, enableHighAccuracy: true }
    )
  }, [])

  const recentCases = [...allCases]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const next: PreviewFile[] = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isImage: file.type.startsWith('image/'),
    }))
    setPreviews((prev) => [...prev, ...next])
  }, [])

  const removePreview = useCallback((index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }, [])

  const addCustomTag = () => {
    const tag = customTag.trim().toUpperCase()
    if (!tag) return
    setActiveTags((prev) => new Set([...prev, tag]))
    setCustomTag('')
  }

  const handleQueue = async () => {
    if (previews.length === 0 || !selectedCaseId) return
    setQueueError(null)

    const tags = Array.from(activeTags)
    const capturedAt = new Date().toISOString()

    try {
      for (const { file, previewUrl } of previews) {
        const mediaType = file.type.startsWith('image/')
          ? 'photo'
          : file.type.startsWith('video/')
            ? 'video'
            : 'document'

        await enqueue({
          localFileUri: previewUrl,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          mediaType,
          caseId: selectedCaseId,
          orgId: '', // resolved server-side from session
          tags,
          notes: notes.trim(),
          capturedAt,
          locationLat: geoLocation?.lat,
          locationLng: geoLocation?.lng,
        })
      }

      setQueueStatus('queued')
      setPreviews([])
      setNotes('')
      ;[cameraInputRef, galleryInputRef, documentInputRef].forEach((ref) => {
        if (ref.current) ref.current.value = ''
      })
      setTimeout(() => setQueueStatus('idle'), 3_000)
    } catch (err) {
      setQueueStatus('error')
      setQueueError(err instanceof Error ? err.message : 'Failed to queue files')
    }
  }

  const pendingCount = stats.pending + stats.uploading
  const failedCount = stats.failed

  return (
    <div className="px-4 py-4 space-y-5 pb-6">
      <h1 className="text-lg font-bold text-charcoal">Capture</h1>

      {/* Queue status banner */}
      {(pendingCount > 0 || failedCount > 0) && (
        <div role="status" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
          failedCount > 0
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          {failedCount > 0
            ? <CloudOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            : (
              <svg className="animate-spin w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )
          }
          {failedCount > 0
            ? `${failedCount} upload${failedCount > 1 ? 's' : ''} failed — will retry when online`
            : `${pendingCount} file${pendingCount > 1 ? 's' : ''} uploading in background…`
          }
        </div>
      )}

      {/* GPS indicator */}
      <div className="flex items-center gap-1.5 text-xs" aria-live="polite">
        <MapPin className="w-3.5 h-3.5 shrink-0 text-muted" aria-hidden="true" />
        {geoStatus === 'capturing' && <span className="text-muted">Capturing location…</span>}
        {geoStatus === 'success' && geoLocation && (
          <span className="text-green-600 font-medium">
            📍 Location captured ({geoLocation.lat.toFixed(4)}, {geoLocation.lng.toFixed(4)})
          </span>
        )}
        {geoStatus === 'failed' && <span className="text-muted">📍 Location unavailable</span>}
      </div>

      {/* Trigger buttons */}
      <div className="grid grid-cols-3 gap-2">
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
          multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <input ref={galleryInputRef} type="file" accept="image/*,video/*,application/pdf"
          multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <input ref={documentInputRef} type="file"
          accept=".pdf,.doc,.docx,.xlsx,.jpg,.png"
          multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

        {[
          { ref: cameraInputRef, Icon: Camera, label: 'Take Photo', ariaLabel: 'Take photo with camera' },
          { ref: galleryInputRef, Icon: ImageIcon, label: 'Gallery', ariaLabel: 'Choose from gallery' },
          { ref: documentInputRef, Icon: FileText, label: 'Document', ariaLabel: 'Upload document' },
        ].map(({ ref, Icon, label, ariaLabel }) => (
          <button
            key={label}
            onClick={() => ref.current?.click()}
            aria-label={ariaLabel}
            className="flex flex-col items-center gap-1.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-xl py-4 hover:border-[#C72A00] active:bg-[#F5F2EE] transition-colors"
          >
            <Icon className="w-6 h-6 text-[#C72A00]" strokeWidth={1.75} aria-hidden="true" />
            <span className="text-[11px] font-medium text-charcoal">{label}</span>
          </button>
        ))}
      </div>

      {/* Preview grid */}
      {previews.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Selected ({previews.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {previews.map((item, idx) => (
              <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {item.isImage
                  ? ( // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1 gap-0.5">
                      <FileText className="w-6 h-6 text-muted" strokeWidth={1.25} aria-hidden="true" />
                      <span className="text-[9px] text-muted text-center line-clamp-2 leading-tight">{item.file.name}</span>
                    </div>
                  )
                }
                <button onClick={() => removePreview(idx)}
                  aria-label={`Remove ${item.file.name}`}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center">
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Case selector */}
      <div>
        <label htmlFor="capture-case-select" className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
          Case
        </label>
        <select id="capture-case-select" value={selectedCaseId}
          onChange={(e) => setSelectedCaseId(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-charcoal outline-none focus:border-[#C72A00] transition-colors">
          <option value="">Select a case…</option>
          {recentCases.map((c: Case) => (
            <option key={c.id} value={c.id}>{c.case_number} — {c.client_name}</option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Tags</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Evidence tags">
          {PRESET_TAGS.map((tag) => (
            <button key={tag} onClick={() => toggleTag(tag)} aria-pressed={activeTags.has(tag)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                activeTags.has(tag)
                  ? 'bg-[#C72A00] text-white border-[#C72A00]'
                  : 'bg-white text-slate border-[#D4CFC7] hover:border-[#C72A00]'
              }`}>
              {tag}
            </button>
          ))}
          {[...activeTags].filter((t) => !(PRESET_TAGS as readonly string[]).includes(t)).map((tag) => (
            <button key={tag} onClick={() => toggleTag(tag)} aria-pressed={true}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-[#C72A00] text-white border-[#C72A00]">
              {tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input type="text" value={customTag} aria-label="Custom tag"
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
            placeholder="Custom tag…"
            className="flex-1 px-3 py-2 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-xs text-charcoal placeholder:text-muted outline-none focus:border-[#C72A00]" />
          <button onClick={addCustomTag} aria-label="Add custom tag"
            className="px-3 py-2 bg-[#C72A00] text-white rounded-lg text-xs font-semibold">
            Add
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="capture-notes" className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
          Notes (optional)
        </label>
        <textarea id="capture-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={2} placeholder="Add notes about this evidence…"
          className="w-full px-3 py-2.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-charcoal placeholder:text-muted outline-none focus:border-[#C72A00] resize-none" />
      </div>

      {/* Error */}
      {queueStatus === 'error' && queueError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          {queueError}
        </div>
      )}

      {/* Queue button */}
      <button onClick={handleQueue}
        disabled={previews.length === 0 || !selectedCaseId}
        aria-label={previews.length > 0 ? `Queue ${previews.length} file${previews.length > 1 ? 's' : ''} for upload` : 'Select files to upload'}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
          previews.length === 0 || !selectedCaseId
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : queueStatus === 'queued'
              ? 'bg-green-600 text-white'
              : 'bg-[#C72A00] text-white hover:bg-[#a82300] active:scale-[0.98]'
        }`}>
        {queueStatus === 'queued'
          ? <><Check className="w-4 h-4" aria-hidden="true" /> Queued for upload</>
          : <><Upload className="w-4 h-4" aria-hidden="true" />
              {previews.length > 0 ? `Queue ${previews.length} file${previews.length > 1 ? 's' : ''}` : 'Queue for upload'}
            </>
        }
      </button>

      {queueStatus === 'queued' && (
        <p className="text-center text-xs text-muted">
          Files upload automatically — even if you leave this screen.
        </p>
      )}
    </div>
  )
}
```

---

## TASK 3 — WIRE THE FIELD CASE DETAIL EVIDENCE TAB TO THE QUEUE

**File to edit:** `web-app/src/app/field/cases/[id]/page.tsx`

The evidence tab in the field case detail also uses `useUploadEvidence()` directly. Update it to use the queue instead.

**Step 3a — Update imports at the top of the file.**

Find this block (it will be near the top, exact line numbers may vary):
```typescript
import { useEvidence, useUploadEvidence } from '@/hooks/use-evidence'
```
Replace with:
```typescript
import { useEvidence } from '@/hooks/use-evidence'
import { useFieldUploadQueue } from '@/hooks/use-field-upload-queue'
import { startQueueProcessor } from '@/lib/upload/field-queue-processor'
```

**Step 3b — Remove the `uploadEvidence` hook call.**

Find this line (it will be near other hook calls inside the component):
```typescript
const uploadEvidence = useUploadEvidence()
```
Delete that line entirely.

**Step 3c — Add queue hooks and start the processor.**

Immediately after the remaining hook declarations (look for a block of `const { data: ... } = use...()` lines), add:

```typescript
const { enqueue, stats: queueStats } = useFieldUploadQueue()

// Start the queue processor once
useEffect(() => {
  return startQueueProcessor()
}, [])
```

Make sure `useEffect` is already imported from `'react'` — it should already be in the import list.

**Step 3d — Replace the upload handler.**

Find the function that handles the photo upload in the evidence tab. It will look approximately like this:

```typescript
const handleEvidenceUpload = async (files: FileList | null) => {
  // ... calls uploadEvidence.mutateAsync(...)
}
```

The exact name and signature may differ slightly — search for `uploadEvidence.mutateAsync` to find it. Replace the entire function body with queue-based logic:

```typescript
const handleEvidenceUpload = async (files: FileList | null) => {
  if (!files || files.length === 0) return
  const capturedAt = new Date().toISOString()

  for (const file of Array.from(files)) {
    const mediaType = file.type.startsWith('image/')
      ? 'photo'
      : file.type.startsWith('video/')
        ? 'video'
        : 'document'

    await enqueue({
      localFileUri: URL.createObjectURL(file),
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      mediaType,
      caseId: id,
      orgId: '',       // resolved server-side from session
      tags: [],
      notes: '',
      capturedAt,
      locationLat: undefined,
      locationLng: undefined,
    })
  }
}
```

**Step 3e — Add a queue status banner to the evidence tab UI.**

Find the JSX section for the evidence tab (it will contain the photo grid and the file input trigger). At the very top of the evidence tab's JSX content — before the photo grid — add this status banner:

```tsx
{(queueStats.pending > 0 || queueStats.uploading > 0 || queueStats.failed > 0) && (
  <div role="status" className={`mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
    queueStats.failed > 0
      ? 'bg-red-50 border border-red-200 text-red-700'
      : 'bg-blue-50 border border-blue-200 text-blue-700'
  }`}>
    {queueStats.failed > 0
      ? `${queueStats.failed} upload${queueStats.failed > 1 ? 's' : ''} failed — will retry when online`
      : `${queueStats.pending + queueStats.uploading} file${(queueStats.pending + queueStats.uploading) > 1 ? 's' : ''} uploading…`
    }
  </div>
)}
```

---

## TASK 4 — ADD `@sparticuz/chromium` AND `puppeteer-core` TO PACKAGE.JSON

**File to edit:** `web-app/package.json`

The PDF adapter at `web-app/src/lib/adapters/pdf.ts` already imports these with `@ts-expect-error` dynamic imports. They need to be installed as actual dependencies.

Open `web-app/package.json`. In the `"dependencies"` object, add the following two entries (place them alphabetically):

```json
"@sparticuz/chromium": "^123.0.1",
"puppeteer-core": "^22.0.0",
```

After editing `package.json`, run:
```bash
cd web-app && npm install
```

**Verify** that `node_modules/@sparticuz/chromium` and `node_modules/puppeteer-core` now exist.

---

## TASK 5 — WIRE THE SIGNATURE PAD INTO THE REPORT BUILDER SECTION

**File to edit:** `web-app/src/components/case/sections/ReportBuilderSection.tsx`

The `SignaturePad` component is already imported at the top of this file and `PenLine` / `CheckCircle2` icons are already imported from lucide-react. What is missing is the actual signature UI.

**Step 5a — Add signature state.**

Find the block of `useState` declarations inside the `ReportBuilderSection` function (they will be near the top of the function body, before the data fetching). Add these three new state variables immediately after the existing ones:

```typescript
const [showSigPad, setShowSigPad] = useState(false)
const [savedSignature, setSavedSignature] = useState<string | null>(null)
const [signerName, setSignerName] = useState('')
const [signerDesignation, setSignerDesignation] = useState('')
const [sigSaving, setSigSaving] = useState(false)
```

**Step 5b — Add the signature save handler.**

Add this function inside the component, after the existing `handleSave` function:

```typescript
const handleSignatureSave = async (dataUrl: string) => {
  if (!report) return
  setSigSaving(true)
  try {
    // Convert dataUrl to blob and upload to Supabase Storage
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], `sig_${report.id}.png`, { type: 'image/png' })

    const fd = new FormData()
    fd.append('file', file)
    fd.append('report_id', report.id)

    const uploadRes = await fetch('/api/reports/signature', {
      method: 'POST',
      body: fd,
    })

    if (uploadRes.ok) {
      const { signedUrl } = await uploadRes.json()
      setSavedSignature(signedUrl ?? dataUrl)
    } else {
      // Fallback: store as data URL in component state (not persisted to DB but visible in session)
      setSavedSignature(dataUrl)
    }
    setShowSigPad(false)
  } catch {
    // Fallback: show in UI even if upload fails
    setSavedSignature(dataUrl)
    setShowSigPad(false)
  } finally {
    setSigSaving(false)
  }
}
```

**Step 5c — Add the signature panel to the JSX.**

Find the closing `</div>` of the `ReportBuilderSection` return statement. It currently ends like this:

```tsx
      <ReportBuilder
        caseData={{...}}
        reportId={report.id}
        orgBranding={orgBranding}
        initialSections={initialSections}
        onSave={handleSave}
      />
    </div>
  )
}
```

Insert the following **between** `</ReportBuilder>` (the closing tag after the `onSave` prop) and the outer `</div>`:

```tsx
      {/* ── Assessor Declaration & Signature ─────────────────────────── */}
      <div className="mt-4 border border-[#D4CFC7] rounded-xl p-4 space-y-4 bg-[#FAFAF8]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-copper" aria-hidden="true" />
            <span className="text-sm font-semibold text-charcoal">Assessor Declaration & Signature</span>
          </div>
          {savedSignature && (
            <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              Signed
            </div>
          )}
        </div>

        {/* Name and designation */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="signer-name" className="block text-xs text-muted mb-1">Full name</label>
            <input
              id="signer-name"
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
            />
          </div>
          <div>
            <label htmlFor="signer-designation" className="block text-xs text-muted mb-1">Designation / qualifications</label>
            <input
              id="signer-designation"
              type="text"
              value={signerDesignation}
              onChange={(e) => setSignerDesignation(e.target.value)}
              placeholder="e.g. MIASA, AIIA"
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
            />
          </div>
        </div>

        {/* Signature display or pad */}
        {savedSignature ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={savedSignature}
              alt="Assessor signature"
              className="h-20 border border-[#D4CFC7] rounded-lg bg-white p-2 object-contain"
            />
            <button
              onClick={() => { setSavedSignature(null); setShowSigPad(true) }}
              aria-label="Re-sign the declaration"
              className="text-xs text-copper underline"
            >
              Re-sign
            </button>
          </div>
        ) : showSigPad ? (
          <div className="space-y-2">
            <SignaturePad
              label="Sign in the box below"
              onSave={handleSignatureSave}
              onClear={() => {}}
              width={480}
              height={160}
            />
            {sigSaving && <p className="text-xs text-muted">Saving signature…</p>}
            <button
              onClick={() => setShowSigPad(false)}
              aria-label="Cancel signing"
              className="text-xs text-muted underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSigPad(true)}
            aria-label="Open signature pad to sign the declaration"
            className="flex items-center gap-2 px-4 py-2.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white hover:border-copper transition-colors"
          >
            <PenLine className="w-4 h-4 text-copper" aria-hidden="true" />
            Sign declaration
          </button>
        )}

        <p className="text-xs text-muted">
          Date: {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
```

**Step 5d — Create the signature upload API route.**

Create this new file: `web-app/src/app/api/reports/signature/route.ts`

```typescript
/**
 * POST /api/reports/signature
 * Uploads an assessor signature image to Supabase Storage.
 * Returns a short-lived signed URL for display.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const querySchema = z.object({
  report_id: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: orgMember } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!orgMember) return NextResponse.json({ error: 'No org' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const reportId = formData.get('report_id') as string | null

    const validation = querySchema.safeParse({ report_id: reportId })
    if (!validation.success || !file) {
      return NextResponse.json({ error: 'file and report_id are required' }, { status: 400 })
    }

    const storagePath = `org/${orgMember.org_id}/signatures/${validation.data.report_id}.png`

    const { error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(storagePath, file, { contentType: 'image/png', upsert: true })

    if (uploadError) throw uploadError

    const { data: urlData } = await supabase.storage
      .from('evidence')
      .createSignedUrl(storagePath, 3600) // 1 hour

    return NextResponse.json({ signedUrl: urlData?.signedUrl ?? null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

---

## TASK 6 — ZOD VALIDATION FOR HIGH-PRIORITY API ROUTES

Add Zod validation to the routes listed below. The pattern is always the same:

1. Add `import { z } from 'zod'` to the imports if not already present (check first)
2. Define a schema constant before the handler function
3. In the handler, replace `const body = await request.json()` with a `safeParse` call
4. Return a 400 if validation fails

**The standard error response shape (use this exactly):**
```typescript
return NextResponse.json(
  { error: 'Invalid request body', details: parseResult.error.flatten() },
  { status: 400 }
)
```

Work through each route below. Do them one file at a time, verifying TypeScript compiles after each.

---

### 6.1 `web-app/src/app/api/cases/[id]/route.ts` — PATCH

Add before the PATCH function:
```typescript
import { z } from 'zod'

const updateCaseSchema = z.object({
  client_name: z.string().min(1).optional(),
  insurer_name: z.string().optional().nullable(),
  broker_name: z.string().optional().nullable(),
  claim_reference: z.string().optional().nullable(),
  loss_date: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.enum(['draft','assigned','site_visit','awaiting_quote','reporting','submitted','additional','closed']).optional(),
  priority: z.enum(['low','normal','high']).optional(),
  vertical: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
}).strict()
```

Replace `const updates: UpdateCaseInput = await request.json()` with:
```typescript
const raw = await request.json()
const parseResult = updateCaseSchema.safeParse(raw)
if (!parseResult.success) {
  return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
}
const updates = parseResult.data
```

---

### 6.2 `web-app/src/app/api/cases/[id]/status/route.ts` — PATCH

Add schema:
```typescript
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['draft','assigned','site_visit','awaiting_quote','reporting','submitted','additional','closed']),
})
```

Replace `const { status } = await request.json()` with:
```typescript
const raw = await request.json()
const parseResult = updateStatusSchema.safeParse(raw)
if (!parseResult.success) {
  return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
}
const { status } = parseResult.data
```

---

### 6.3 `web-app/src/app/api/cases/[id]/risk-items/route.ts` — POST

Add schema:
```typescript
import { z } from 'zod'

const createRiskItemSchema = z.object({
  risk_type: z.string().min(1),
  is_primary: z.boolean().optional(),
  data: z.record(z.unknown()).optional(),
})
```

Replace `const body = await request.json()` with:
```typescript
const raw = await request.json()
const parseResult = createRiskItemSchema.safeParse(raw)
if (!parseResult.success) {
  return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
}
const body = parseResult.data
```

---

### 6.4 `web-app/src/app/api/cases/[id]/requirement-checks/route.ts` — PATCH

Add schema:
```typescript
import { z } from 'zod'

const updateCheckSchema = z.object({
  requirement_check_id: z.string().uuid(),
  status: z.enum(['missing','provided','not_applicable']),
  evidence_id: z.string().uuid().optional().nullable(),
  note: z.string().optional().nullable(),
})
```

Find where `await request.json()` is called in the PATCH handler and replace the destructuring with safeParse.

---

### 6.5 `web-app/src/app/api/mandates/route.ts` — POST

Add schema:
```typescript
import { z } from 'zod'

const createMandateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  vertical: z.string().optional().nullable(),
  is_default: z.boolean().optional(),
  clone_from_id: z.string().uuid().optional().nullable(),
})
```

Replace `const body = await request.json()` with safeParse.

---

### 6.6 `web-app/src/app/api/mandates/[mandateId]/route.ts` — PUT

Add schema:
```typescript
import { z } from 'zod'

const updateMandateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  vertical: z.string().optional().nullable(),
  is_default: z.boolean().optional(),
})
```

---

### 6.7 `web-app/src/app/api/mandates/[mandateId]/requirements/route.ts` — POST and PUT

Add schema covering both methods:
```typescript
import { z } from 'zod'

const requirementSchema = z.object({
  key: z.string().min(1).optional(),
  label: z.string().min(1),
  description: z.string().optional().nullable(),
  required: z.boolean().optional(),
  evidence_type: z.enum(['photo','video','document','text_note','none']).optional(),
  order_index: z.number().int().min(0).optional(),
})
```

---

### 6.8 `web-app/src/app/api/clients/route.ts` — POST

Add schema:
```typescript
import { z } from 'zod'

const createClientSchema = z.object({
  name: z.string().min(1),
  contact_name: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  vat_number: z.string().optional().nullable(),
})
```

---

### 6.9 `web-app/src/app/api/clients/[clientId]/route.ts` — PATCH

Add schema:
```typescript
import { z } from 'zod'

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  contact_name: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  vat_number: z.string().optional().nullable(),
}).strict()
```

---

### 6.10 `web-app/src/app/api/reports/[reportId]/sections/route.ts` — POST and PATCH

Add schema:
```typescript
import { z } from 'zod'

const createSectionSchema = z.object({
  section_key: z.string().min(1),
  heading: z.string().min(1),
  body_md: z.string(),
  order_index: z.number().int().min(0),
})

const upsertSectionsSchema = z.object({
  sections: z.array(z.object({
    id: z.string().uuid().optional(),
    section_key: z.string().min(1),
    heading: z.string().min(1),
    body_md: z.string(),
    order_index: z.number().int().min(0),
  })),
})
```

Apply the appropriate schema to POST (createSectionSchema) and PATCH/bulk-upsert (upsertSectionsSchema).

---

### 6.11 `web-app/src/app/api/appointments/route.ts` — POST

Add schema:
```typescript
import { z } from 'zod'

const createAppointmentSchema = z.object({
  case_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
})
```

Replace the destructuring of `body` with safeParse.

---

### 6.12 `web-app/src/app/api/billing/checkout/route.ts` — POST

Add schema:
```typescript
import { z } from 'zod'

const checkoutSchema = z.object({
  mode: z.enum(['credits', 'subscription']),
  priceId: z.string().min(1),
  quantity: z.number().int().min(1).optional(),
})
```

Replace `const body = await req.json()` and the subsequent destructuring with safeParse.

---

### 6.13 `web-app/src/app/api/events/track/route.ts` — POST

Add schema:
```typescript
import { z } from 'zod'

const trackEventSchema = z.object({
  event_name: z.string().min(1).max(100),
  event_props: z.record(z.unknown()).optional(),
  vertical: z.string().optional(),
})
```

---

### 6.14 `web-app/src/app/api/org/profile/route.ts` — PATCH

Add schema:
```typescript
import { z } from 'zod'

const updateOrgProfileSchema = z.object({
  name: z.string().min(1).optional(),
  legal_name: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  vat_number: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})
```

---

### 6.15 Remaining routes — apply minimal validation

For all remaining routes in the list below that accept a body, apply at minimum this pattern — a simple object check before passing to the database:

```typescript
import { z } from 'zod'
const bodySchema = z.object({}).passthrough() // allows any keys but confirms it is an object
```

This is a safety net, not full validation — it prevents `null`, arrays, and non-object primitives from reaching the database. Apply this to:

- `cases/[id]/mandates/route.ts` POST
- `cases/[id]/notify/route.ts` POST
- `cases/[id]/comms/route.ts` POST
- `cases/[id]/priority/route.ts` PATCH
- `comms-templates/route.ts` POST
- `comms-templates/[templateId]/route.ts` PATCH
- `comms/send/route.ts` POST
- `recordings/upload/route.ts` POST
- `calendar/blocks/route.ts` POST
- `calendar/blocks/[id]/route.ts` PATCH
- `inbound/[id]/route.ts` PATCH
- `org/specialisations/route.ts` PATCH
- `clients/[clientId]/rates/route.ts` POST
- `clients/[clientId]/rules/route.ts` POST
- `notification-rules/route.ts` POST
- `assessment-rates/route.ts` POST

---

## TASK 7 — FIX INVOICE NUMBER (CLIENT-SIDE GENERATION)

**File to edit:** `web-app/src/components/case/sections/InvoiceBuilderSection.tsx`

**Step 7a** — Verify the file currently has `formatCurrency` imported. Look for this import:
```typescript
import { formatCurrency } from '@/lib/utils/formatting'
```
If it is missing, add it.

**Step 7b** — Find and replace the `generateInvoiceNumber` function and the `fmt` function. They currently look like this:
```typescript
function generateInvoiceNumber(): string {
  const now = new Date()
  const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${seq}`
}

function fmt(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
```

Replace with:
```typescript
/**
 * Invoice number is generated server-side on save (sequential, collision-safe).
 * This placeholder is shown until the POST /api/invoices response arrives.
 */
const PENDING_INVOICE_NUMBER = 'INV-PENDING'

function fmt(n: number) {
  return formatCurrency(n)
}
```

**Step 7c** — Find the `useState` initialisation for `invoiceNumber`:
```typescript
invoiceNumber: generateInvoiceNumber(),
```
Replace with:
```typescript
invoiceNumber: PENDING_INVOICE_NUMBER,
```

**Step 7d** — Find the save handler. After `setSavedInvoiceId(data.id)`, add:
```typescript
// Use the server-generated invoice number
if (data.reference) {
  setInvoice(prev => ({ ...prev, invoiceNumber: data.reference }))
}
```

---

## TASK 8 — CREATE `TESTING_FLOWS.md`

**Create this file at the project root:** `TESTING_FLOWS.md`

```markdown
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
```

---

## TASK 9 — ACCESSIBILITY: ARIA-LABELS ON ICON BUTTONS IN CASE SECTIONS

Sweep the following files and add `aria-label` attributes to every button that contains only an icon (no visible text). Also add `aria-hidden="true"` to the icon itself inside such buttons.

**Files to sweep:**

- `web-app/src/components/case/sections/FindingsListSection.tsx`
- `web-app/src/components/case/sections/RedFlagsSection.tsx`
- `web-app/src/components/case/sections/TimeDisbursementsSection.tsx`
- `web-app/src/components/case/sections/InvestigationTimelineSection.tsx`
- `web-app/src/components/case/sections/EvidenceGridSection.tsx`
- `web-app/src/components/case/sections/MandateChecklistSection.tsx`
- `web-app/src/components/case/sections/InvoiceBuilderSection.tsx`
- `web-app/src/components/case/sections/PackBuilderSection.tsx`
- `web-app/src/components/case/sections/PartiesSummarySection.tsx`
- `web-app/src/components/case/sections/DocumentLogSection.tsx`

**Pattern to apply:**

Before (icon-only button, inaccessible):
```tsx
<button onClick={handleDelete} className="...">
  <Trash2 className="w-4 h-4" />
</button>
```

After (accessible):
```tsx
<button onClick={handleDelete} aria-label="Delete finding" className="...">
  <Trash2 className="w-4 h-4" aria-hidden="true" />
</button>
```

Common labels to use:
- Delete/remove buttons → `"Delete [item type]"` e.g. `"Delete finding"`, `"Delete time entry"`, `"Delete line item"`
- Edit buttons → `"Edit [item type]"`
- Expand/collapse buttons → `"Expand [item]"` / `"Collapse [item]"`
- Up/down reorder buttons → `"Move [item] up"` / `"Move [item] down"`
- Close/dismiss buttons → `"Close"` or `"Dismiss"`
- Add buttons with only a `+` or Plus icon → `"Add [item type]"`

Also ensure every form `<input>` and `<textarea>` without a visible `<label>` has an `aria-label` attribute.

---

## TASK 10 — VERIFY BUILD COMPILES

After completing all tasks, run the following from the `web-app/` directory:

```bash
npx tsc --noEmit
```

Fix any TypeScript errors before considering this done. Common errors to expect:

- `enqueue` type mismatch if `orgId` is typed as non-optional — check `EnqueueInput` in `field-upload-queue.ts` and make `orgId` optional or keep it as an empty string
- `startQueueProcessor` imported but not yet typed — verify the export is correctly typed in `field-queue-processor.ts`
- Signature state variables used before they are checked for null — add null guards where TypeScript flags them
- `@sparticuz/chromium` and `puppeteer-core` may still show type errors until `npm install` is run — run `npm install` first, then typecheck

Also run:
```bash
npm test
```

Existing tests must still pass. The `field-upload-queue.test.ts` file tests the IndexedDB queue functions — these tests should continue to pass unchanged.

---

## COMPLETION CHECKLIST

Before marking this prompt complete, verify each item:

- [ ] `web-app/src/lib/upload/field-queue-processor.ts` — new file created
- [ ] `web-app/src/app/field/capture/page.tsx` — rewrites to use `enqueue()`, processor started on mount
- [ ] `web-app/src/app/field/cases/[id]/page.tsx` — evidence upload uses `enqueue()`, queue status banner shown
- [ ] `web-app/package.json` — `@sparticuz/chromium` and `puppeteer-core` added, `npm install` run
- [ ] `web-app/src/components/case/sections/ReportBuilderSection.tsx` — signature pad UI and save handler added
- [ ] `web-app/src/app/api/reports/signature/route.ts` — new file created
- [ ] Zod validation added to all 15 high-priority routes (Tasks 6.1–6.14) plus passthrough on remaining 16
- [ ] `web-app/src/components/case/sections/InvoiceBuilderSection.tsx` — client-side invoice number removed, server number captured on save, `en-ZA` locale hardcoding replaced with `formatCurrency`
- [ ] `TESTING_FLOWS.md` created at project root
- [ ] Aria-labels added to icon-only buttons in all 10 listed section files
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm test` passes

---

*End of prompt. Apply tasks in order. Do not refactor beyond what is described.*
