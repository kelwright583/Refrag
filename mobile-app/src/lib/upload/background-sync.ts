/**
 * Background sync — triggers the queue processor on:
 *  • AppState 'active' (returning from background)
 *  • Network connectivity restored
 *  • 30-second foreground interval
 *  • expo-background-fetch task (when available)
 */

import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { uploadQueue } from '@/lib/db/upload-queue.db';
import { queueProcessor } from './queue-processor';

const BG_TASK_NAME = 'REFRAG_UPLOAD_QUEUE_SYNC';
const FOREGROUND_POLL_MS = 30_000;

let foregroundInterval: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let netInfoUnsubscribe: (() => void) | null = null;

async function triggerSync(): Promise<void> {
  if (queueProcessor.running) return;

  const stats = await uploadQueue.getQueueStats();
  if (stats.pending > 0 || stats.failed > 0) {
    queueProcessor.start();
  }
}

function handleAppStateChange(nextState: AppStateStatus): void {
  if (nextState === 'active') {
    triggerSync();
  }
}

function handleConnectivityChange(state: NetInfoState): void {
  if (state.isConnected) {
    triggerSync();
  }
}

function startForegroundPoll(): void {
  if (foregroundInterval) return;
  foregroundInterval = setInterval(triggerSync, FOREGROUND_POLL_MS);
}

function stopForegroundPoll(): void {
  if (foregroundInterval) {
    clearInterval(foregroundInterval);
    foregroundInterval = null;
  }
}

/**
 * Register the expo-background-fetch task.
 * Silently no-ops if the module isn't linked or permissions are unavailable.
 */
async function registerBackgroundTask(): Promise<void> {
  try {
    TaskManager.defineTask(BG_TASK_NAME, async () => {
      try {
        await uploadQueue.init();
        const stats = await uploadQueue.getQueueStats();

        if (stats.pending === 0) {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        await queueProcessor.start();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch {
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    await BackgroundFetch.registerTaskAsync(BG_TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes minimum
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // Background fetch not available on this platform / config
  }
}

/**
 * Initialise all sync triggers. Call once at app startup (e.g. in root _layout).
 * Returns a teardown function.
 */
export function setupBackgroundSync(): () => void {
  uploadQueue.init().then(() => {
    uploadQueue.recoverStuckUploads().then((recovered) => {
      if (recovered > 0) {
        console.log(`[BackgroundSync] Recovered ${recovered} stuck uploads`);
      }
    });
  });

  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  netInfoUnsubscribe = NetInfo.addEventListener(handleConnectivityChange);

  startForegroundPoll();
  registerBackgroundTask();

  triggerSync();

  return () => {
    appStateSubscription?.remove();
    netInfoUnsubscribe?.();
    stopForegroundPoll();
  };
}
