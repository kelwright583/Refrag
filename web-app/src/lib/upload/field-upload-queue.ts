/**
 * Field Upload Queue — IndexedDB-backed queue for offline evidence uploads.
 * Uses native IndexedDB API (no external dependencies).
 */

const DB_NAME = 'refrag-upload-queue'
const STORE_NAME = 'queue'
const DB_VERSION = 1

export interface QueueItem {
  id: string
  localFileUri: string       // blob URL or base64
  fileName: string
  fileSize: number
  contentType: string
  mediaType: 'photo' | 'video' | 'document'
  caseId: string
  orgId: string
  tags: string[]
  notes: string
  capturedAt: string
  locationLat?: number
  locationLng?: number
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
  retryCount: number
  lastError?: string
  createdAt: string
}

export interface QueueStats {
  pending: number
  uploading: number
  uploaded: number
  failed: number
}

// ── DB initialisation ─────────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('caseId', 'caseId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        const req = fn(store)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
  )
}

function getAllFromStore(): Promise<QueueItem[]> {
  return openDB().then(
    (db) =>
      new Promise<QueueItem[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result as QueueItem[])
        req.onerror = () => reject(req.error)
      })
  )
}

// ── Public API ───────────────────────────────────────────────────────────────

export type EnqueueInput = Omit<QueueItem, 'id' | 'createdAt' | 'status' | 'retryCount'>

export async function enqueue(input: EnqueueInput): Promise<QueueItem> {
  const item: QueueItem = {
    ...input,
    id: crypto.randomUUID(),
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  }
  await withStore<IDBValidKey>('readwrite', (store) => store.add(item))
  return item
}

export function getAll(): Promise<QueueItem[]> {
  return getAllFromStore()
}

export async function getByStatus(status: QueueItem['status']): Promise<QueueItem[]> {
  const db = await openDB()
  return new Promise<QueueItem[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('status')
    const req = index.getAll(IDBKeyRange.only(status))
    req.onsuccess = () => resolve(req.result as QueueItem[])
    req.onerror = () => reject(req.error)
  })
}

export async function updateStatus(
  id: string,
  status: QueueItem['status'],
  error?: string
): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const item = getReq.result as QueueItem | undefined
      if (!item) {
        resolve()
        return
      }
      const updated: QueueItem = {
        ...item,
        status,
        lastError: error,
        retryCount: status === 'failed' ? item.retryCount + 1 : item.retryCount,
      }
      const putReq = store.put(updated)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export function remove(id: string): Promise<undefined> {
  return withStore<undefined>('readwrite', (store) => store.delete(id) as IDBRequest<undefined>)
}

export async function getStats(): Promise<QueueStats> {
  const items = await getAllFromStore()
  return items.reduce<QueueStats>(
    (acc, item) => {
      acc[item.status]++
      return acc
    },
    { pending: 0, uploading: 0, uploaded: 0, failed: 0 }
  )
}
