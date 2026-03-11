/**
 * Upload queue processor
 * Handles offline-first uploads with retry logic
 */

import NetInfo from '@react-native-community/netinfo';
import { useUploadQueueStore } from '@/store/upload-queue';
import { uploadEvidenceFile, createEvidence } from '@/lib/api/evidence';
import { generateStoragePath } from './storage';
import { UploadQueueItem } from '@/lib/types/evidence';

let isProcessing = false;
let retryTimeout: NodeJS.Timeout | null = null;

/**
 * Check network connectivity
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

/**
 * Process a single queue item
 */
async function processQueueItem(item: UploadQueueItem): Promise<void> {
  const { updateQueueItem, removeFromQueue } = useUploadQueueStore.getState();

  try {
    // Update status to uploading
    await updateQueueItem(item.id, { status: 'uploading' });

    // Generate storage path
    const storagePath = generateStoragePath(item.org_id, item.case_id, item.file_name);

    // Upload file to Supabase Storage
    await uploadEvidenceFile(item.local_file_uri, storagePath, item.content_type);

    // Create evidence record
    await createEvidence({
      case_id: item.case_id,
      storage_path: storagePath,
      media_type: item.media_type,
      content_type: item.content_type,
      file_name: item.file_name,
      file_size: item.file_size,
      captured_at: item.captured_at,
      notes: item.notes,
      tags: item.tags,
    });

    // Mark as complete and remove from queue
    await updateQueueItem(item.id, { status: 'complete' });
    await removeFromQueue(item.id);
  } catch (error: any) {
    console.error('Error processing queue item:', error);
    
    const retryCount = item.retry_count + 1;
    const maxRetries = 5;

    if (retryCount >= maxRetries) {
      // Mark as failed after max retries
      await updateQueueItem(item.id, {
        status: 'failed',
        retry_count: retryCount,
        last_error: error.message,
      });
    } else {
      // Retry with exponential backoff
      await updateQueueItem(item.id, {
        status: 'pending',
        retry_count: retryCount,
        last_error: error.message,
      });
    }
  }
}

/**
 * Process all pending items in the queue
 */
export async function processUploadQueue(): Promise<void> {
  if (isProcessing) return;

  const online = await isOnline();
  if (!online) {
    console.log('Offline - skipping queue processing');
    return;
  }

  isProcessing = true;
  const { getPendingItems } = useUploadQueueStore.getState();
  const pendingItems = getPendingItems();

  if (pendingItems.length === 0) {
    isProcessing = false;
    return;
  }

  console.log(`Processing ${pendingItems.length} pending uploads...`);

  // Process items sequentially to avoid overwhelming the network
  for (const item of pendingItems) {
    await processQueueItem(item);
    // Small delay between uploads
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  isProcessing = false;

  // Schedule next check if there are still pending items
  const remainingPending = useUploadQueueStore.getState().getPendingItems();
  if (remainingPending.length > 0) {
    scheduleNextProcess();
  }
}

/**
 * Schedule next queue processing with exponential backoff
 */
function scheduleNextProcess() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
  }

  const delay = Math.min(30000, 1000 * Math.pow(2, 3)); // Max 30 seconds
  retryTimeout = setTimeout(() => {
    processUploadQueue();
  }, delay);
}

/**
 * Start monitoring connectivity and processing queue
 */
export function startUploadProcessor() {
  // Process immediately if online
  processUploadQueue();

  // Listen for connectivity changes
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      processUploadQueue();
    }
  });

  // Process queue periodically (every 30 seconds when online)
  const interval = setInterval(() => {
    isOnline().then((online) => {
      if (online) {
        processUploadQueue();
      }
    });
  }, 30000);

  return () => {
    unsubscribe();
    clearInterval(interval);
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }
  };
}
