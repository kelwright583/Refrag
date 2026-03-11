/**
 * Upload queue store using Zustand
 * Manages offline-first evidence upload queue
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UploadQueueItem } from '@/lib/types/evidence';

const QUEUE_STORAGE_KEY = 'upload_queue';

interface UploadQueueState {
  items: UploadQueueItem[];
  loading: boolean;
  loadQueue: () => Promise<void>;
  addToQueue: (item: Omit<UploadQueueItem, 'id' | 'status' | 'retry_count' | 'created_at'>) => Promise<void>;
  updateQueueItem: (id: string, updates: Partial<UploadQueueItem>) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  getPendingItems: () => UploadQueueItem[];
  getFailedItems: () => UploadQueueItem[];
}

export const useUploadQueueStore = create<UploadQueueState>((set, get) => ({
  items: [],
  loading: false,

  loadQueue: async () => {
    try {
      set({ loading: true });
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as UploadQueueItem[];
        set({ items, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error loading upload queue:', error);
      set({ loading: false });
    }
  },

  addToQueue: async (itemData) => {
    const newItem: UploadQueueItem = {
      ...itemData,
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString(),
    };

    const updatedItems = [...get().items, newItem];
    set({ items: updatedItems });
    
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedItems));
    } catch (error) {
      console.error('Error saving to queue:', error);
    }
  },

  updateQueueItem: async (id: string, updates: Partial<UploadQueueItem>) => {
    const updatedItems = get().items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    set({ items: updatedItems });
    
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedItems));
    } catch (error) {
      console.error('Error updating queue item:', error);
    }
  },

  removeFromQueue: async (id: string) => {
    const updatedItems = get().items.filter((item) => item.id !== id);
    set({ items: updatedItems });
    
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedItems));
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
