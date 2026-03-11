/**
 * Appointments API - fetch from Supabase
 * Schema: appointments (org_id, case_id, scheduled_at, address, notes, assigned_to, started_at, completed_at)
 */

import { supabase } from '@/lib/supabase/client';

export interface Appointment {
  id: string;
  org_id: string;
  case_id: string;
  scheduled_at: string;
  address: string | null;
  notes: string | null;
  assigned_to: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  case?: {
    id: string;
    case_number: string;
    client_name: string;
  };
}

export async function getAppointments(
  orgId: string,
  options?: { from?: string; to?: string; caseId?: string }
): Promise<Appointment[]> {
  let q = supabase
    .from('appointments')
    .select('*, case:cases(id, case_number, client_name)')
    .eq('org_id', orgId)
    .order('scheduled_at', { ascending: true });

  if (options?.caseId) {
    q = q.eq('case_id', options.caseId);
  }
  if (options?.from) {
    q = q.gte('scheduled_at', options.from);
  }
  if (options?.to) {
    q = q.lte('scheduled_at', options.to);
  }

  const { data, error } = await q.limit(100);
  if (error) throw error;
  return (data || []) as Appointment[];
}

export async function createAppointment(input: {
  case_id: string;
  scheduled_at: string;
  address?: string;
  notes?: string;
}): Promise<Appointment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!member) throw new Error('No org');

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      org_id: member.org_id,
      case_id: input.case_id,
      scheduled_at: new Date(input.scheduled_at).toISOString(),
      address: input.address || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Appointment;
}

export async function updateAppointment(
  id: string,
  input: { scheduled_at?: string; address?: string | null; notes?: string | null; completed_at?: string | null }
): Promise<Appointment> {
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (input.scheduled_at !== undefined) updates.scheduled_at = new Date(input.scheduled_at).toISOString();
  if (input.address !== undefined) updates.address = input.address;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.completed_at !== undefined) updates.completed_at = input.completed_at ? new Date(input.completed_at).toISOString() : null;

  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Appointment;
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
