/**
 * Case API functions
 */

import { supabase } from '@/lib/supabase/client';
import { Case, CreateCaseInput } from '@/lib/types/case';
import { useOrgStore } from '@/store/org';
import { useAuthStore } from '@/store/auth';

export async function getCases(orgId: string): Promise<Case[]> {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCase(caseId: string): Promise<Case | null> {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single();

  if (error) throw error;
  return data;
}

export async function createCase(input: CreateCaseInput & { org_id: string; created_by: string }): Promise<Case> {
  // Fetch org slug for case number generation
  const { data: org, error: orgError } = await supabase
    .from('organisations')
    .select('slug')
    .eq('id', input.org_id)
    .single();

  if (orgError) throw orgError;

  // Generate case number (format: ORGSLUG-YYYY-0001)
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const case_number = `${org.slug.toUpperCase()}-${year}-${random}`;

  const { data, error } = await supabase
    .from('cases')
    .insert({
      ...input,
      case_number,
      status: input.status || 'draft',
      priority: input.priority || 'normal',
    })
    .select()
    .single();

  if (error) throw error;

  // Log audit event
  await logAuditEvent({
    org_id: input.org_id,
    actor_user_id: input.created_by,
    case_id: data.id,
    action: 'CASE_CREATED',
    details: { case_number: data.case_number },
  });

  return data;
}

export async function updateCase(
  caseId: string,
  updates: Partial<CreateCaseInput>
): Promise<Case> {
  const user = useAuthStore.getState().user;
  const selectedOrgId = useOrgStore.getState().selectedOrgId;

  if (!user || !selectedOrgId) {
    throw new Error('User or org not found');
  }

  const { data, error } = await supabase
    .from('cases')
    .update(updates)
    .eq('id', caseId)
    .select()
    .single();

  if (error) throw error;

  // Log audit event
  await logAuditEvent({
    org_id: selectedOrgId,
    actor_user_id: user.id,
    case_id: caseId,
    action: 'CASE_UPDATED',
    details: updates,
  });

  return data;
}

export async function updateCaseStatus(
  caseId: string,
  status: Case['status']
): Promise<Case> {
  const user = useAuthStore.getState().user;
  const selectedOrgId = useOrgStore.getState().selectedOrgId;

  if (!user || !selectedOrgId) {
    throw new Error('User or org not found');
  }

  const { data, error } = await supabase
    .from('cases')
    .update({ status })
    .eq('id', caseId)
    .select()
    .single();

  if (error) throw error;

  // Log audit event
  await logAuditEvent({
    org_id: selectedOrgId,
    actor_user_id: user.id,
    case_id: caseId,
    action: 'CASE_STATUS_CHANGED',
    details: { status },
  });

  return data;
}

export async function searchCases(orgId: string, query: string): Promise<Case[]> {
  const searchTerm = `%${query}%`;
  
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('org_id', orgId)
    .or(`case_number.ilike."${searchTerm}",client_name.ilike."${searchTerm}",claim_reference.ilike."${searchTerm}"`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
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
