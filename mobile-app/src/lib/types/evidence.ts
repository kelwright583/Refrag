/**
 * Evidence types
 */

export type MediaType = 'photo' | 'video' | 'document' | 'audio';

export interface Evidence {
  id: string;
  org_id: string;
  case_id: string;
  uploaded_by: string;
  storage_path: string;
  media_type: MediaType;
  content_type: string;
  file_name: string;
  file_size: number;
  captured_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceTag {
  id: string;
  org_id: string;
  case_id: string;
  evidence_id: string;
  tag: string;
  created_at: string;
}

export interface EvidenceWithTags extends Evidence {
  tags: string[];
}

export interface CreateEvidenceInput {
  case_id: string;
  storage_path: string;
  media_type: MediaType;
  content_type: string;
  file_name: string;
  file_size: number;
  captured_at?: string;
  notes?: string;
  tags?: string[];
}

export type QueueItemStatus = 'pending' | 'uploading' | 'failed' | 'complete';

export interface QueueItem {
  id: string;
  local_file_uri: string;
  org_id: string;
  case_id: string;
  media_type: string;
  content_type: string;
  file_name: string;
  file_size: number;
  tags: string;
  notes: string;
  captured_at: string;
  location_lat: number | null;
  location_lng: number | null;
  status: QueueItemStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
}

export interface QueueStats {
  pending: number;
  uploading: number;
  failed: number;
  complete: number;
}

export type EnqueueInput = Omit<
  QueueItem,
  'id' | 'status' | 'retry_count' | 'last_error' | 'created_at'
>;

/** @deprecated Use QueueItem + UploadQueueDB instead */
export interface UploadQueueItem {
  id: string;
  local_file_uri: string;
  org_id: string;
  case_id: string;
  media_type: MediaType;
  content_type: string;
  file_name: string;
  file_size: number;
  tags: string[];
  notes?: string;
  captured_at?: string;
  status: 'pending' | 'uploading' | 'failed' | 'complete';
  retry_count: number;
  last_error?: string;
  created_at: string;
}
