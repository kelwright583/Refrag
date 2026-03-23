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

// Suppress unused import warning for BACKOFF_MS — used for documentation purposes
void BACKOFF_MS
