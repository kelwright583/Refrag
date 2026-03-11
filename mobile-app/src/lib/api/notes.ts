/**
 * Case notes and comms log API functions
 */

import { supabase } from '@/lib/supabase/client';
import { useOrgStore } from '@/store/org';
import { useAuthStore } from '@/store/auth';
import {
  CaseNote,
  CaseNoteWithUser,
  CommsLogEntry,
  CommsLogEntryWithUser,
  CreateCaseNoteInput,
  CreateCommsLogInput,
} from '@/lib/types/notes';

/**
 * Get case notes
 */
export async function getCaseNotes(
  caseId: string
): Promise<CaseNoteWithUser[]> {
  const { data, error } = await supabase
    .from('case_notes')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Note: User email lookup would require a database function or view
  // For now, we'll just return the user_id
  return (data || []).map((item) => ({
    ...item,
    created_by_user: undefined, // User info would need to be fetched separately
  }));
}

/**
 * Create a case note
 */
export async function createCaseNote(
  input: CreateCaseNoteInput
): Promise<CaseNote> {
  const orgId = useOrgStore.getState().selectedOrgId;
  const userId = useAuthStore.getState().session?.user?.id;

  if (!orgId || !userId) {
    throw new Error('No org or user selected');
  }

  const { data, error } = await supabase
    .from('case_notes')
    .insert({
      org_id: orgId,
      case_id: input.case_id,
      created_by: userId,
      body_md: input.body_md,
    })
    .select()
    .single();

  if (error) throw error;

  // Log audit event
  await supabase.from('audit_log').insert({
    org_id: orgId,
    actor_user_id: userId,
    case_id: input.case_id,
    action: 'case_note_created',
    details: { note_id: data.id },
  });

  return data;
}

/**
 * Update a case note
 */
export async function updateCaseNote(
  noteId: string,
  bodyMd: string
): Promise<void> {
  const orgId = useOrgStore.getState().selectedOrgId;
  const userId = useAuthStore.getState().session?.user?.id;

  if (!orgId || !userId) {
    throw new Error('No org or user selected');
  }

  const { error } = await supabase
    .from('case_notes')
    .update({ body_md: bodyMd })
    .eq('id', noteId)
    .eq('created_by', userId); // Only allow updating own notes

  if (error) throw error;
}

/**
 * Delete a case note
 */
export async function deleteCaseNote(noteId: string): Promise<void> {
  const orgId = useOrgStore.getState().selectedOrgId;
  const userId = useAuthStore.getState().session?.user?.id;

  if (!orgId || !userId) {
    throw new Error('No org or user selected');
  }

  const { error } = await supabase
    .from('case_notes')
    .delete()
    .eq('id', noteId)
    .eq('created_by', userId); // Only allow deleting own notes

  if (error) throw error;
}

/**
 * Get comms log entries
 */
export async function getCommsLog(
  caseId: string
): Promise<CommsLogEntryWithUser[]> {
  const { data, error } = await supabase
    .from('comms_log')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Note: User email lookup would require a database function or view
  // For now, we'll just return the user_id
  return (data || []).map((item) => ({
    ...item,
    sent_by_user: undefined, // User info would need to be fetched separately
  }));
}

/**
 * Create a comms log entry
 */
export async function createCommsLogEntry(
  input: CreateCommsLogInput
): Promise<CommsLogEntry> {
  const orgId = useOrgStore.getState().selectedOrgId;
  const userId = useAuthStore.getState().session?.user?.id;

  if (!orgId || !userId) {
    throw new Error('No org or user selected');
  }

  const { data, error } = await supabase
    .from('comms_log')
    .insert({
      org_id: orgId,
      case_id: input.case_id,
      sent_by: userId,
      channel: input.channel,
      body_md: input.body_md,
      to_recipients: input.to_recipients || null,
      subject: input.subject || null,
    })
    .select()
    .single();

  if (error) throw error;

  // Log audit event
  await supabase.from('audit_log').insert({
    org_id: orgId,
    actor_user_id: userId,
    case_id: input.case_id,
    action: 'comms_log_entry_created',
    details: {
      comms_log_id: data.id,
      channel: input.channel,
    },
  });

  return data;
}
