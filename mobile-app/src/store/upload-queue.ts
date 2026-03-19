/**
 * Upload queue store using Zustand + SQLite
 * Manages offline-first evidence upload queue backed by expo-sqlite.
 */

import { create } from 'zustand';
import { uploadQueue } from '@/lib/db/upload-queue.db';
import type { QueueItem, EnqueueInput } from '@/lib/types/evidence';

interface UploadQueueState {
  items: QueueItem[];
  loading: boolean;
  loadQueue: () => Promise<void>;
  addToQueue: (item: EnqueueInput) => Promise<void>;
  updateQueueItem: (id: string, updates: Partial<Pick<QueueItem, 'status' | 'retry_count' | 'last_error'>>) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  getPendingItems: () => QueueItem[];
  getFailedItems: () => QueueItem[];
}

export const useUploadQueueStore = create<UploadQueueState>((set, get) => ({
  items: [],
  loading: false,

  loadQueue: async () => {
    try {
      set({ loading: true });
      await uploadQueue.init();
      await uploadQueue.recoverStuckUploads();
      const items = await uploadQueue.getAll();
      set({ items, loading: false });
    } catch (error) {
      console.error('Error loading upload queue:', error);
      set({ loading: false });
    }
  },

  addToQueue: async (itemData) => {
    try {
      await uploadQueue.init();
      await uploadQueue.enqueue(itemData);
      const items = await uploadQueue.getAll();
      set({ items });
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  },

  updateQueueItem: async (id, updates) => {
    try {
      await uploadQueue.init();
      if (updates.status === 'uploading') {
        await uploadQueue.markUploading(id);
      } else if (updates.status === 'complete') {
        await uploadQueue.markComplete(id);
      } else if (updates.status === 'failed') {
        await uploadQueue.markFailed(id, updates.last_error || 'Unknown error');
      }
      const items = await uploadQueue.getAll();
      set({ items });
    } catch (error) {
      console.error('Error updating queue item:', error);
    }
  },

  removeFromQueue: async (id) => {
    try {
      await uploadQueue.init();
      await uploadQueue.remove(id);
      const items = await uploadQueue.getAll();
      set({ items });
    } catch (error) {
      console.error('Error removing from queue:', error);
    }
  },

  getPendingItems: () => {
    return get().items.filter((item) => item.status === 'pending');
  },

  getFailedItems: () => {
    return get().items.filter((item) => item.status === 'failed');
  },
}));
