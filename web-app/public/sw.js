/**
 * Refrag PWA Service Worker — v2
 * Production-grade caching strategy with Background Sync support
 */

const CACHE_NAME = 'refrag-v2'
const STATIC_ASSETS = [
  '/',
  '/login',
  '/app/dashboard',
  '/app/cases',
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME)
        await cache.addAll(STATIC_ASSETS.map((u) => new Request(u, { cache: 'reload' })))
      } catch (err) {
        // Gracefully ignore pre-cache failures — assets may not exist yet
        console.warn('[SW] Pre-cache failed (non-fatal):', err)
      }
      self.skipWaiting()
    })()
  )
})

// ── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
      await self.clients.claim()
    })()
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET requests
  if (request.method !== 'GET') return

  // API routes: network-first, fall back to cache if offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request))
    return
  }

  // Static assets: cache-first, update in background
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|otf)$/)
  ) {
    event.respondWith(cacheFirstWithUpdate(request))
    return
  }

  // Navigation requests to /app/*: serve from cache, fall back to /app/dashboard
  if (request.mode === 'navigate' && url.pathname.startsWith('/app/')) {
    event.respondWith(navigationWithCacheFallback(request, '/app/dashboard'))
    return
  }

  // All other navigations: network first, fall back to /offline
  if (request.mode === 'navigate') {
    event.respondWith(navigationWithOfflineFallback(request))
    return
  }
})

// ── Strategy helpers ─────────────────────────────────────────────────────────

async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function cacheFirstWithUpdate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  // Update cache in background regardless
  const networkFetch = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)

  if (cached) return cached
  // No cached version — wait for network
  const networkResponse = await networkFetch
  return networkResponse || new Response('Asset unavailable', { status: 503 })
}

async function navigationWithCacheFallback(request, fallbackPath) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    const fallback = await cache.match(fallbackPath)
    if (fallback) return fallback
    return new Response('Offline', { status: 503 })
  }
}

async function navigationWithOfflineFallback(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    const offline = await cache.match('/offline')
    if (offline) return offline
    return new Response('<h1>Offline</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

// ── Background Sync ──────────────────────────────────────────────────────────

if (self.registration && 'sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'refrag-evidence-queue') {
      event.waitUntil(processEvidenceQueue())
    }
  })
}

async function processEvidenceQueue() {
  // Notify clients to process the IndexedDB upload queue
  const clients = await self.clients.matchAll({ type: 'window' })
  for (const client of clients) {
    client.postMessage({ type: 'PROCESS_UPLOAD_QUEUE' })
  }
}

// ── Message handling ─────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
