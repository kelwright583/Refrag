/**
 * React hooks for the SQLite upload queue.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadQueue } from '@/lib/db/upload-queue.db';
import { queueProcessor } from './queue-processor';
import type { QueueItem, QueueStats, EnqueueInput } from '@/lib/types/evidence';

const POLL_MS = 2_000;

export function useUploadQueue() {
  const [stats, setStats] = useState<QueueStats>({ pending: 0, uploading: 0, failed: 0, complete: 0 });
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(queueProcessor.running);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const [s, all] = await Promise.all([
        uploadQueue.getQueueStats(),
        uploadQueue.getAll(),
      ]);
      if (!mounted.current) return;
      setStats(s);
      setItems(all);
      setIsProcessing(queueProcessor.running);
    } catch {
      // DB may not be ready yet
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();

    const unsub = queueProcessor.subscribe(() => {
      if (mounted.current) refresh();
    });

    const interval = setInterval(refresh, POLL_MS);

    return () => {
      mounted.current = false;
      unsub();
      clearInterval(interval);
    };
  }, [refresh]);

  const enqueue = useCallback(async (item: EnqueueInput) => {
    await uploadQueue.enqueue(item);
    await refresh();
    if (!queueProcessor.running) queueProcessor.start();
  }, [refresh]);

  const retryItem = useCallback(async (id: string) => {
    await uploadQueue.retryFailed(id);
    await refresh();
    if (!queueProcessor.running) queueProcessor.start();
  }, [refresh]);

  const retryAll = useCallback(async () => {
    await uploadQueue.retryAllFailed();
    await refresh();
    if (!queueProcessor.running) queueProcessor.start();
  }, [refresh]);

  const removeItem = useCallback(async (id: string) => {
    await uploadQueue.remove(id);
    await refresh();
  }, [refresh]);

  const clearCompleted = useCallback(async () => {
    await uploadQueue.removeCompleted();
    await refresh();
  }, [refresh]);

  return {
    stats,
    items,
    isProcessing,
    enqueue,
    retryItem,
    retryAll,
    removeItem,
    clearCompleted,
  };
}
