/**
 * SQLite-backed upload queue using expo-sqlite.
 *
 * Replaces the previous AsyncStorage implementation for reliability
 * under field conditions (50+ photos, low connectivity, app backgrounding).
 */

import * as SQLite from 'expo-sqlite';
import type { QueueItem, QueueItemStatus, QueueStats, EnqueueInput } from '@/lib/types/evidence';

const DB_NAME = 'refrag_upload_queue.db';

export class UploadQueueDB {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await SQLite.openDatabaseAsync(DB_NAME);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS upload_queue (
        id             TEXT PRIMARY KEY,
        local_file_uri TEXT NOT NULL,
        org_id         TEXT NOT NULL,
        case_id        TEXT NOT NULL,
        media_type     TEXT NOT NULL,
        content_type   TEXT NOT NULL,
        file_name      TEXT NOT NULL,
        file_size      INTEGER NOT NULL,
        tags           TEXT NOT NULL DEFAULT '[]',
        notes          TEXT NOT NULL DEFAULT '',
        captured_at    TEXT NOT NULL,
        location_lat   REAL,
        location_lng   REAL,
        status         TEXT NOT NULL DEFAULT 'pending',
        retry_count    INTEGER NOT NULL DEFAULT 0,
        last_error     TEXT,
        created_at     TEXT NOT NULL
      );
    `);

    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_queue_status ON upload_queue(status);
    `);
  }

  private getDB(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error('UploadQueueDB not initialised — call init() first');
    return this.db;
  }

  async enqueue(item: EnqueueInput): Promise<string> {
    const db = this.getDB();
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO upload_queue
        (id, local_file_uri, org_id, case_id, media_type, content_type,
         file_name, file_size, tags, notes, captured_at,
         location_lat, location_lng, status, retry_count, last_error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?)`,
      id,
      item.local_file_uri,
      item.org_id,
      item.case_id,
      item.media_type,
      item.content_type,
      item.file_name,
      item.file_size,
      item.tags,
      item.notes,
      item.captured_at,
      item.location_lat,
      item.location_lng,
      now,
    );

    return id;
  }

  async getPending(limit = 50): Promise<QueueItem[]> {
    const db = this.getDB();
    return db.getAllAsync<QueueItem>(
      `SELECT * FROM upload_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
      limit,
    );
  }

  async getFailed(): Promise<QueueItem[]> {
    const db = this.getDB();
    return db.getAllAsync<QueueItem>(
      `SELECT * FROM upload_queue WHERE status = 'failed' ORDER BY created_at ASC`,
    );
  }

  async getAll(): Promise<QueueItem[]> {
    const db = this.getDB();
    return db.getAllAsync<QueueItem>(
      `SELECT * FROM upload_queue ORDER BY created_at DESC`,
    );
  }

  async getQueueStats(): Promise<QueueStats> {
    const db = this.getDB();
    const rows = await db.getAllAsync<{ status: string; cnt: number }>(
      `SELECT status, COUNT(*) as cnt FROM upload_queue GROUP BY status`,
    );

    const stats: QueueStats = { pending: 0, uploading: 0, failed: 0, complete: 0 };
    for (const row of rows) {
      if (row.status in stats) {
        stats[row.status as QueueItemStatus] = row.cnt;
      }
    }
    return stats;
  }

  async markUploading(id: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `UPDATE upload_queue SET status = 'uploading' WHERE id = ?`,
      id,
    );
  }

  async markComplete(id: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `UPDATE upload_queue SET status = 'complete' WHERE id = ?`,
      id,
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `UPDATE upload_queue SET status = 'failed', last_error = ? WHERE id = ?`,
      error,
      id,
    );
  }

  async incrementRetry(id: string, error: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `UPDATE upload_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
      error,
      id,
    );
  }

  async retryFailed(id: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `UPDATE upload_queue SET status = 'pending', last_error = NULL WHERE id = ? AND status = 'failed'`,
      id,
    );
  }

  async retryAllFailed(): Promise<void> {
    const db = this.getDB();
    await db.runAsync(
      `UPDATE upload_queue SET status = 'pending', last_error = NULL WHERE status = 'failed'`,
    );
  }

  async removeCompleted(): Promise<void> {
    const db = this.getDB();
    await db.runAsync(`DELETE FROM upload_queue WHERE status = 'complete'`);
  }

  async remove(id: string): Promise<void> {
    const db = this.getDB();
    await db.runAsync(`DELETE FROM upload_queue WHERE id = ?`, id);
  }

  /**
   * Reset any items stuck in 'uploading' (e.g. after a crash) back to 'pending'.
   * Called during init to recover gracefully.
   */
  async recoverStuckUploads(): Promise<number> {
    const db = this.getDB();
    const result = await db.runAsync(
      `UPDATE upload_queue SET status = 'pending' WHERE status = 'uploading'`,
    );
    return result.changes;
  }
}

export const uploadQueue = new UploadQueueDB();
