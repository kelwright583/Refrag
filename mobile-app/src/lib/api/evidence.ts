/**
 * Evidence API functions
 */

import { supabase } from '@/lib/supabase/client';
import { Evidence, EvidenceWithTags, CreateEvidenceInput } from '@/lib/types/evidence';
import { useAuthStore } from '@/store/auth';
import { useOrgStore } from '@/store/org';

export async function getEvidence(caseId: string): Promise<EvidenceWithTags[]> {
  const { data, error } = await supabase
    .from('evidence')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Fetch tags for each evidence item
  const evidenceWithTags = await Promise.all(
    (data || []).map(async (item) => {
      const { data: tags } = await supabase
        .from('evidence_tags')
        .select('tag')
        .eq('evidence_id', item.id);

      return {
        ...item,
        tags: tags?.map((t) => t.tag) || [],
      };
    })
  );

  return evidenceWithTags;
}

export async function uploadEvidenceFile(
  fileUri: string,
  storagePath: string,
  contentType: string
): Promise<void> {
  // For React Native, we need to use FormData or read as base64
  // Using fetch with FormData for better compatibility
  const formData = new FormData();
  
  // Extract filename from URI
  const fileName = fileUri.split('/').pop() || 'file';
  
  // Create file object for FormData
  formData.append('file', {
    uri: fileUri,
    type: contentType,
    name: fileName,
  } as any);

  // Use Supabase storage upload with file URI
  // Note: Supabase JS client handles React Native file URIs
  const fileResponse = await fetch(fileUri);
  const blob = await fileResponse.blob();

  const { error } = await supabase.storage
    .from('evidence')
    .upload(storagePath, blob, {
      contentType,
      upsert: false,
    });

  if (error) throw error;
}

export async function createEvidence(input: CreateEvidenceInput): Promise<Evidence> {
  const user = useAuthStore.getState().user;
  const selectedOrgId = useOrgStore.getState().selectedOrgId;

  if (!user || !selectedOrgId) {
    throw new Error('User or org not found');
  }

  // Create evidence record
  const { data: evidence, error: evidenceError } = await supabase
    .from('evidence')
    .insert({
      org_id: selectedOrgId,
      case_id: input.case_id,
      uploaded_by: user.id,
      storage_path: input.storage_path,
      media_type: input.media_type,
      content_type: input.content_type,
      file_name: input.file_name,
      file_size: input.file_size,
      captured_at: input.captured_at || new Date().toISOString(),
      notes: input.notes || null,
    })
    .select()
    .single();

  if (evidenceError) throw evidenceError;

  // Create tags if provided
  if (input.tags && input.tags.length > 0) {
    const tagInserts = input.tags.map((tag) => ({
      org_id: selectedOrgId,
      case_id: input.case_id,
      evidence_id: evidence.id,
      tag: tag.trim(),
    }));

    const { error: tagsError } = await supabase
      .from('evidence_tags')
      .insert(tagInserts);

    if (tagsError) {
      console.error('Error creating tags:', tagsError);
      // Don't throw - evidence was created successfully
    }
  }

  // Log audit event
  await logAuditEvent({
    org_id: selectedOrgId,
    actor_user_id: user.id,
    case_id: input.case_id,
    action: 'EVIDENCE_UPLOADED',
    details: { evidence_id: evidence.id, media_type: input.media_type },
  });

  return evidence;
}

export async function deleteEvidence(evidenceId: string, caseId: string): Promise<void> {
  const user = useAuthStore.getState().user;
  const selectedOrgId = useOrgStore.getState().selectedOrgId;

  if (!user || !selectedOrgId) {
    throw new Error('User or org not found');
  }

  // Get evidence to delete storage file
  const { data: evidence, error: fetchError } = await supabase
    .from('evidence')
    .select('storage_path')
    .eq('id', evidenceId)
    .single();

  if (fetchError) throw fetchError;

  // Delete from storage
  if (evidence.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('evidence')
      .remove([evidence.storage_path]);

    if (storageError) {
      console.error('Error deleting storage file:', storageError);
      // Continue with DB deletion even if storage fails
    }
  }

  // Delete tags first (foreign key constraint)
  await supabase
    .from('evidence_tags')
    .delete()
    .eq('evidence_id', evidenceId);

  // Delete evidence record
  const { error: deleteError } = await supabase
    .from('evidence')
    .delete()
    .eq('id', evidenceId);

  if (deleteError) throw deleteError;

  // Log audit event
  await logAuditEvent({
    org_id: selectedOrgId,
    actor_user_id: user.id,
    case_id: caseId,
    action: 'EVIDENCE_DELETED',
    details: { evidence_id: evidenceId },
  });
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('evidence')
    .createSignedUrl(storagePath, 3600);

  if (error) throw error;
  return data.signedUrl;
}

export async function getSignedUrls(
  storagePaths: string[]
): Promise<Record<string, string>> {
  if (storagePaths.length === 0) return {};

  const { data, error } = await supabase.storage
    .from('evidence')
    .createSignedUrls(storagePaths, 3600);

  if (error) throw error;

  const urlMap: Record<string, string> = {};
  data?.forEach((item) => {
    if (item.signedUrl && !item.error) {
      urlMap[item.path] = item.signedUrl;
    }
  });
  return urlMap;
}

export async function addEvidenceTags(
  evidenceId: string,
  tags: string[],
  caseId: string
): Promise<void> {
  const selectedOrgId = useOrgStore.getState().selectedOrgId;

  if (!selectedOrgId) {
    throw new Error('Org not found');
  }

  const tagInserts = tags.map((tag) => ({
    org_id: selectedOrgId,
    case_id: caseId,
    evidence_id: evidenceId,
    tag: tag.trim(),
  }));

  const { error } = await supabase
    .from('evidence_tags')
    .insert(tagInserts);

  if (error) throw error;
}

export async function removeEvidenceTag(
  evidenceId: string,
  tag: string
): Promise<void> {
  const { error } = await supabase
    .from('evidence_tags')
    .delete()
    .eq('evidence_id', evidenceId)
    .eq('tag', tag);

  if (error) throw error;
}

async function logAuditEvent(params: {
  org_id: string;
  actor_user_id: string;
  case_id: string;
  action: string;
  details?: Record<string, any>;
}) {
  await supabase.from('audit_log').insert({
    org_id: params.org_id,
    actor_user_id: params.actor_user_id,
    case_id: params.case_id,
    action: params.action,
    details: params.details || {},
  });
}
