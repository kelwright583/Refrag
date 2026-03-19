/**
 * Upload queue processor.
 *
 * Pulls pending items from the SQLite queue and uploads them to
 * Supabase Storage with concurrent workers and exponential back-off.
 */

import { uploadQueue } from '@/lib/db/upload-queue.db';
import { uploadEvidenceFile, createEvidence } from '@/lib/api/evidence';
import { generateStoragePath } from '@/lib/utils/storage';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';
import { useOrgStore } from '@/store/org';
import type { QueueItem } from '@/lib/types/evidence';

type ProcessorListener = () => void;

const MAX_RETRIES = 4;
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 1_800_000]; // 30s, 2m, 10m, 30m

export class QueueProcessor {
  private isRunning = false;
  private maxConcurrent = 3;
  private activeUploads = 0;
  private listeners: Set<ProcessorListener> = new Set();

  get running(): boolean {
    return this.isRunning;
  }

  subscribe(fn: ProcessorListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try { fn(); } catch { /* swallow */ }
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.notify();
    this.drainQueue();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.notify();
  }

  /**
   * Continuously pull pending items until the queue is empty or processor is stopped.
   */
  private async drainQueue(): Promise<void> {
    while (this.isRunning) {
      if (this.activeUploads >= this.maxConcurrent) {
        await sleep(500);
        continue;
      }

      const items = await uploadQueue.getPending(this.maxConcurrent - this.activeUploads);
      if (items.length === 0) break;

      for (const item of items) {
        if (!this.isRunning) break;
        if (this.activeUploads >= this.maxConcurrent) break;

        this.activeUploads++;
        this.processItem(item).finally(() => {
          this.activeUploads--;
          this.notify();
        });
      }

      await sleep(300);
    }

    this.isRunning = false;
    this.notify();
  }

  private async processItem(item: QueueItem): Promise<void> {
    try {
      await uploadQueue.markUploading(item.id);
      this.notify();

      await this.uploadItem(item);

      await uploadQueue.markComplete(item.id);
      this.notify();
    } catch (err: any) {
      const errorMsg = err?.message || String(err);

      await uploadQueue.incrementRetry(item.id, errorMsg);

      if (item.retry_count + 1 >= MAX_RETRIES) {
        await uploadQueue.markFailed(item.id, errorMsg);
      } else {
        const delay = this.getRetryDelay(item.retry_count);
        setTimeout(() => {
          uploadQueue.retryFailed(item.id).then(() => {
            if (this.isRunning) this.drainQueue();
          });
        }, delay);
        await uploadQueue.markFailed(item.id, `Will retry in ${Math.round(delay / 1000)}s — ${errorMsg}`);
      }

      this.notify();
    }
  }

  private async uploadItem(item: QueueItem): Promise<void> {
    const storagePath = generateStoragePath(item.org_id, item.case_id, item.file_name);

    await uploadEvidenceFile(item.local_file_uri, storagePath, item.content_type);

    const tags: string[] = (() => {
      try { return JSON.parse(item.tags); } catch { return []; }
    })();

    const evidence = await createEvidence({
      case_id: item.case_id,
      storage_path: storagePath,
      media_type: item.media_type as any,
      content_type: item.content_type,
      file_name: item.file_name,
      file_size: item.file_size,
      captured_at: item.captured_at,
      notes: item.notes || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });

    await this.emitPlatformEvent(item, evidence.id);
  }

  private async emitPlatformEvent(item: QueueItem, evidenceId: string): Promise<void> {
    try {
      const user = useAuthStore.getState().user;
      const orgId = useOrgStore.getState().selectedOrgId;
      if (!user || !orgId) return;

      await supabase.from('platform_events').insert({
        org_id: orgId,
        event_type: 'evidence_uploaded',
        actor_user_id: user.id,
        payload: {
          evidence_id: evidenceId,
          case_id: item.case_id,
          media_type: item.media_type,
          file_name: item.file_name,
        },
      });
    } catch {
      // Non-critical — don't fail the upload for a platform event
    }
  }

  private getRetryDelay(retryCount: number): number {
    return RETRY_DELAYS_MS[Math.min(retryCount, RETRY_DELAYS_MS.length - 1)];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const queueProcessor = new QueueProcessor();
