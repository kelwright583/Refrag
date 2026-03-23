import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── IndexedDB mock ─────────────────────────────────────────────────────────────

const mockStore = new Map<string, any>()

const mockObjectStore = {
  add: vi.fn((item: any) => {
    mockStore.set(item.id, item)
    const req: any = { onsuccess: null, onerror: null }
    Promise.resolve().then(() => req.onsuccess?.())
    return req
  }),
  get: vi.fn((id: string) => {
    const req: any = { result: mockStore.get(id), onsuccess: null, onerror: null }
    Promise.resolve().then(() => req.onsuccess?.())
    return req
  }),
  getAll: vi.fn(() => {
    const req: any = { result: [...mockStore.values()], onsuccess: null, onerror: null }
    Promise.resolve().then(() => req.onsuccess?.())
    return req
  }),
  put: vi.fn((item: any) => {
    mockStore.set(item.id, item)
    const req: any = { onsuccess: null, onerror: null }
    Promise.resolve().then(() => req.onsuccess?.())
    return req
  }),
  delete: vi.fn((id: string) => {
    mockStore.delete(id)
    const req: any = { onsuccess: null, onerror: null }
    Promise.resolve().then(() => req.onsuccess?.())
    return req
  }),
  index: vi.fn(() => mockObjectStore),
  openCursor: vi.fn(() => ({ result: null, onsuccess: null })),
}

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore),
  oncomplete: null,
  onerror: null,
}

const mockDb = {
  transaction: vi.fn(() => mockTransaction),
  objectStoreNames: { contains: vi.fn(() => true) },
  createObjectStore: vi.fn(() => mockObjectStore),
}

const mockOpenRequest: any = {
  result: mockDb,
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
}

vi.stubGlobal('indexedDB', {
  open: vi.fn(() => {
    Promise.resolve().then(() => mockOpenRequest.onsuccess?.())
    return mockOpenRequest
  }),
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEnqueueInput(overrides: Partial<Record<string, any>> = {}) {
  return {
    localFileUri: 'blob:http://localhost/abc-123',
    fileName: 'photo.jpg',
    fileSize: 102400,
    contentType: 'image/jpeg',
    mediaType: 'photo' as const,
    caseId: 'case-1',
    orgId: 'org-1',
    tags: ['front', 'damage'],
    notes: 'Front bumper crack',
    capturedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// Import after mocks are in place so openDB picks up the mocked global
import {
  enqueue,
  getAll,
  getStats,
  updateStatus,
  remove,
} from './field-upload-queue'

describe('field-upload-queue', () => {
  beforeEach(() => {
    mockStore.clear()
    vi.clearAllMocks()

    // Re-wire mock internals after clearAllMocks
    mockObjectStore.add.mockImplementation((item: any) => {
      mockStore.set(item.id, item)
      const req: any = { onsuccess: null, onerror: null }
      Promise.resolve().then(() => req.onsuccess?.())
      return req
    })
    mockObjectStore.get.mockImplementation((id: string) => {
      const req: any = { result: mockStore.get(id), onsuccess: null, onerror: null }
      Promise.resolve().then(() => req.onsuccess?.())
      return req
    })
    mockObjectStore.getAll.mockImplementation(() => {
      const req: any = { result: [...mockStore.values()], onsuccess: null, onerror: null }
      Promise.resolve().then(() => req.onsuccess?.())
      return req
    })
    mockObjectStore.put.mockImplementation((item: any) => {
      mockStore.set(item.id, item)
      const req: any = { onsuccess: null, onerror: null }
      Promise.resolve().then(() => req.onsuccess?.())
      return req
    })
    mockObjectStore.delete.mockImplementation((id: string) => {
      mockStore.delete(id)
      const req: any = { onsuccess: null, onerror: null }
      Promise.resolve().then(() => req.onsuccess?.())
      return req
    })
    mockObjectStore.index.mockReturnValue(mockObjectStore)
    mockTransaction.objectStore.mockReturnValue(mockObjectStore)
    mockDb.transaction.mockReturnValue(mockTransaction)
    ;(indexedDB.open as ReturnType<typeof vi.fn>).mockImplementation(() => {
      Promise.resolve().then(() => mockOpenRequest.onsuccess?.())
      return mockOpenRequest
    })
  })

  describe('enqueue()', () => {
    it('adds an item with status "pending"', async () => {
      const item = await enqueue(makeEnqueueInput())

      expect(item.status).toBe('pending')
      expect(item.id).toBeTruthy()
      expect(item.retryCount).toBe(0)
      expect(item.createdAt).toBeTruthy()
    })

    it('stores the input fields on the returned item', async () => {
      const input = makeEnqueueInput({ fileName: 'rear.jpg', caseId: 'case-42' })
      const item = await enqueue(input)

      expect(item.fileName).toBe('rear.jpg')
      expect(item.caseId).toBe('case-42')
      expect(item.mediaType).toBe('photo')
    })

    it('generates a unique id per item', async () => {
      const a = await enqueue(makeEnqueueInput())
      const b = await enqueue(makeEnqueueInput())

      expect(a.id).not.toBe(b.id)
    })
  })

  describe('getStats()', () => {
    it('returns correct counts for a mixed queue', async () => {
      // Seed the mockStore directly with known statuses
      mockStore.set('a', { id: 'a', status: 'pending' })
      mockStore.set('b', { id: 'b', status: 'pending' })
      mockStore.set('c', { id: 'c', status: 'uploading' })
      mockStore.set('d', { id: 'd', status: 'uploaded' })
      mockStore.set('e', { id: 'e', status: 'failed' })

      const stats = await getStats()

      expect(stats.pending).toBe(2)
      expect(stats.uploading).toBe(1)
      expect(stats.uploaded).toBe(1)
      expect(stats.failed).toBe(1)
    })

    it('returns all-zero stats for an empty queue', async () => {
      const stats = await getStats()

      expect(stats).toEqual({ pending: 0, uploading: 0, uploaded: 0, failed: 0 })
    })
  })

  describe('updateStatus()', () => {
    it('changes item status from pending to uploading', async () => {
      mockStore.set('item-1', {
        id: 'item-1',
        status: 'pending',
        retryCount: 0,
        fileName: 'test.jpg',
      })

      await updateStatus('item-1', 'uploading')

      const updated = mockStore.get('item-1')
      expect(updated.status).toBe('uploading')
    })

    it('increments retryCount when status is set to failed', async () => {
      mockStore.set('item-2', {
        id: 'item-2',
        status: 'uploading',
        retryCount: 1,
        fileName: 'test.jpg',
      })

      await updateStatus('item-2', 'failed', 'Network error')

      const updated = mockStore.get('item-2')
      expect(updated.status).toBe('failed')
      expect(updated.retryCount).toBe(2)
      expect(updated.lastError).toBe('Network error')
    })

    it('does not increment retryCount for non-failed transitions', async () => {
      mockStore.set('item-3', {
        id: 'item-3',
        status: 'uploading',
        retryCount: 2,
        fileName: 'test.jpg',
      })

      await updateStatus('item-3', 'uploaded')

      const updated = mockStore.get('item-3')
      expect(updated.retryCount).toBe(2)
    })

    it('resolves without error for a non-existent id', async () => {
      await expect(updateStatus('does-not-exist', 'uploaded')).resolves.toBeUndefined()
    })
  })

  describe('remove()', () => {
    it('removes an item from the store', async () => {
      mockStore.set('item-del', {
        id: 'item-del',
        status: 'uploaded',
        fileName: 'photo.jpg',
      })

      expect(mockStore.has('item-del')).toBe(true)

      await remove('item-del')

      expect(mockStore.has('item-del')).toBe(false)
    })

    it('resolves without error when removing a non-existent item', async () => {
      await expect(remove('ghost-id')).resolves.toBeUndefined()
    })
  })
})
