// Offline cache for case data
// Uses IndexedDB store 'refrag-offline-cache'
// TTL: 24 hours per item

interface CacheEntry {
  url: string       // the API URL (key)
  data: unknown
  cachedAt: string  // ISO date string
}

const DB_NAME = 'refrag-offline-cache'
const STORE_NAME = 'cache'
const VERSION = 1
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' })
      }
    }

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error)
    }
  })
}

async function getCacheEntry(url: string): Promise<CacheEntry | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(url)

      request.onsuccess = (event) => {
        const entry = (event.target as IDBRequest<CacheEntry | undefined>).result
        if (!entry) {
          resolve(null)
          return
        }
        // Check TTL
        const age = Date.now() - new Date(entry.cachedAt).getTime()
        if (age > TTL_MS) {
          resolve(null)
          return
        }
        resolve(entry)
      }

      request.onerror = () => {
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

async function setCacheEntry(url: string, data: unknown): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const entry: CacheEntry = { url, data, cachedAt: new Date().toISOString() }
      const request = store.put(entry)

      request.onsuccess = () => resolve()
      request.onerror = (event) => reject((event.target as IDBRequest).error)
    })
  } catch {
    // IndexedDB unavailable (SSR, private browsing) — silently ignore
  }
}

async function invalidateCase(caseId: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.openCursor()
      const keysToDelete: string[] = []

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
        if (cursor) {
          const entry = cursor.value as CacheEntry
          if (entry.url.includes(caseId)) {
            keysToDelete.push(entry.url)
          }
          cursor.continue()
        } else {
          // Delete all matching keys
          const deleteTx = db.transaction(STORE_NAME, 'readwrite')
          const deleteStore = deleteTx.objectStore(STORE_NAME)
          let remaining = keysToDelete.length
          if (remaining === 0) {
            resolve()
            return
          }
          keysToDelete.forEach((key) => {
            const del = deleteStore.delete(key)
            del.onsuccess = () => {
              remaining--
              if (remaining === 0) resolve()
            }
            del.onerror = (e) => reject((e.target as IDBRequest).error)
          })
        }
      }

      request.onerror = (event) => reject((event.target as IDBRequest).error)
    })
  } catch {
    // Silently ignore
  }
}

async function clearExpired(): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.openCursor()

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
        if (cursor) {
          const entry = cursor.value as CacheEntry
          const age = Date.now() - new Date(entry.cachedAt).getTime()
          if (age > TTL_MS) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = (event) => reject((event.target as IDBRequest).error)
    })
  } catch {
    // Silently ignore
  }
}

export { getCacheEntry, setCacheEntry, invalidateCase, clearExpired }
export type { CacheEntry }
