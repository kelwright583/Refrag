'use client'

/**
 * React hook for the IndexedDB field upload queue.
 * Polls every 2 seconds when the tab is visible.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getAll,
  getStats,
  enqueue,
  remove,
  updateStatus,
  type QueueItem,
  type QueueStats,
  type EnqueueInput,
} from '@/lib/upload/field-upload-queue'

const POLL_INTERVAL_MS = 2_000

interface UseFieldUploadQueueReturn {
  items: QueueItem[]
  stats: QueueStats
  enqueue: (input: EnqueueInput) => Promise<QueueItem>
  retry: (id: string) => Promise<void>
  clear: (id: string) => Promise<void>
}

const DEFAULT_STATS: QueueStats = { pending: 0, uploading: 0, uploaded: 0, failed: 0 }

export function useFieldUploadQueue(): UseFieldUploadQueueReturn {
  const [items, setItems] = useState<QueueItem[]>([])
  const [stats, setStats] = useState<QueueStats>(DEFAULT_STATS)

  const refresh = useCallback(async () => {
    try {
      const [allItems, currentStats] = await Promise.all([getAll(), getStats()])
      setItems(allItems)
      setStats(currentStats)
    } catch {
      // IndexedDB may not be available (SSR or private mode)
    }
  }, [])

  useEffect(() => {
    // Initial load
    refresh()

    let intervalId: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (intervalId) return
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          refresh()
        }
      }, POLL_INTERVAL_MS)
    }

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh()
        startPolling()
      } else {
        stopPolling()
      }
    }

    // Start polling if visible
    if (document.visibilityState === 'visible') {
      startPolling()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refresh])

  const enqueueItem = useCallback(
    async (input: EnqueueInput): Promise<QueueItem> => {
      const item = await enqueue(input)
      await refresh()
      return item
    },
    [refresh]
  )

  const retry = useCallback(
    async (id: string): Promise<void> => {
      await updateStatus(id, 'pending')
      await refresh()
    },
    [refresh]
  )

  const clear = useCallback(
    async (id: string): Promise<void> => {
      await remove(id)
      await refresh()
    },
    [refresh]
  )

  return { items, stats, enqueue: enqueueItem, retry, clear }
}
