/**
 * Mandate API functions
 */

import { supabase } from '@/lib/supabase/client';
import { useOrgStore } from '@/store/org';
import { useAuthStore } from '@/store/auth';
import {
  Mandate,
  MandateRequirement,
  RequirementCheck,
  RequirementCheckWithDetails,
  CaseMandateWithDetails,
  AssignMandateInput,
  UpdateRequirementCheckInput,
} from '@/lib/types/mandate';

/**
 * Get all mandates for the current org
 */
export async function getMandates(orgId: string): Promise<Mandate[]> {
  const { data, error } = await supabase
    .from('mandates')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get mandate by ID
 */
export async function getMandate(mandateId: string): Promise<Mandate | null> {
  const { data, error } = await supabase
    .from('mandates')
    .select('*')
    .eq('id', mandateId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get mandate requirements
 */
export async function getMandateRequirements(
  mandateId: string
): Promise<MandateRequirement[]> {
  const { data, error } = await supabase
    .from('mandate_requirements')
    .select('*')
    .eq('mandate_id', mandateId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get case mandates
 */
export async function getCaseMandates(
  caseId: string
): Promise<CaseMandateWithDetails[]> {
  const { data, error } = await supabase
    .from('case_mandates')
    .select(`
      *,
      mandate:mandates(*)
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((item) => ({
    ...item,
    mandate: item.mandate as Mandate,
  }));
}

/**
 * Get requirement checks for a case
 */
export async function getRequirementChecks(
  caseId: string
): Promise<RequirementCheckWithDetails[]> {
  const { data, error } = await supabase
    .from('requirement_checks')
    .select(`
      *,
      requirement:mandate_requirements(*),
      evidence:evidence(id, file_name, media_type)
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((item) => ({
    ...item,
    requirement: item.requirement as MandateRequirement,
    evidence: item.evidence
      ? {
          id: item.evidence.id,
          file_name: item.evidence.file_name,
          media_type: item.evidence.media_type,
        }
      : null,
  }));
}

/**
 * Assign a mandate to a case
 * This will auto-create requirement_checks for all mandate requirements
 */
export async function assignMandateToCase(
  input: AssignMandateInput
): Promise<void> {
  const orgId = useOrgStore.getState().selectedOrgId;
  const userId = useAuthStore.getState().session?.user?.id;

  if (!orgId || !userId) {
    throw new Error('No org or user selected');
  }

  // Start a transaction-like operation
  // First, assign the mandate
  const { error: assignError } = await supabase
    .from('case_mandates')
    .insert({
      org_id: orgId,
      case_id: input.case_id,
      mandate_id: input.mandate_id,
    });

  if (assignError) {
    // If already assigned, that's okay
    if (assignError.code !== '23505') {
      throw assignError;
    }
  }

  // Get all requirements for this mandate
  const requirements = await getMandateRequirements(input.mandate_id);

  // Create requirement_checks for each requirement
  const checksToInsert = requirements.map((req) => ({
    org_id: orgId,
    case_id: input.case_id,
    mandate_requirement_id: req.id,
    status: 'missing' as const,
  }));

  if (checksToInsert.length > 0) {
    const { error: checksError } = await supabase
      .from('requirement_checks')
      .upsert(checksToInsert, {
        onConflict: 'case_id,mandate_requirement_id',
        ignoreDuplicates: false,
      });

    if (checksError) throw checksError;
  }

  // Log audit event
  await supabase.from('audit_log').insert({
    org_id: orgId,
    actor_user_id: userId,
    case_id: input.case_id,
    action: 'mandate_assigned',
    details: { mandate_id: input.mandate_id },
  });
}

/**
 * Update a requirement check
 */
export async function updateRequirementCheck(
  input: UpdateRequirementCheckInput
): Promise<void> {
  const orgId = useOrgStore.getState().selectedOrgId;
  const userId = useAuthStore.getState().session?.user?.id;

  if (!orgId || !userId) {
    throw new Error('No org or user selected');
  }

  const updateData: any = {};
  if (input.status !== undefined) updateData.status = input.status;
  if (input.evidence_id !== undefined) updateData.evidence_id = input.evidence_id;
  if (input.note !== undefined) updateData.note = input.note;

  const { error } = await supabase
    .from('requirement_checks')
    .update(updateData)
    .eq('id', input.requirement_check_id);

  if (error) throw error;

  // Log audit event
  const { data: check } = await supabase
    .from('requirement_checks')
    .select('case_id')
    .eq('id', input.requirement_check_id)
    .single();

  if (check) {
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: userId,
      case_id: check.case_id,
      action: 'requirement_check_updated',
      details: {
        requirement_check_id: input.requirement_check_id,
        ...updateData,
      },
    });
  }
}

/**
 * Link evidence to a requirement check
 */
export async function linkEvidenceToRequirement(
  requirementCheckId: string,
  evidenceId: string
): Promise<void> {
  await updateRequirementCheck({
    requirement_check_id: requirementCheckId,
    evidence_id: evidenceId,
    status: 'provided',
  });
}
