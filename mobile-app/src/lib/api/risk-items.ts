/**
 * Risk item API functions (Supabase direct)
 */

import { supabase } from '@/lib/supabase/client'
import { CaseRiskItem, CreateRiskItemInput, UpdateRiskItemInput } from '@/lib/types/risk-item'
import { useOrgStore } from '@/store/org'
import { useAuthStore } from '@/store/auth'

export async function getRiskItems(caseId: string): Promise<CaseRiskItem[]> {
  const { data, error } = await supabase
    .from('case_risk_items')
    .select('*')
    .eq('case_id', caseId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createRiskItem(input: CreateRiskItemInput): Promise<CaseRiskItem> {
  const selectedOrgId = useOrgStore.getState().selectedOrgId
  const user = useAuthStore.getState().user
  if (!selectedOrgId) throw new Error('No org selected')

  // If primary, unset existing primary
  if (input.is_primary) {
    await supabase
      .from('case_risk_items')
      .update({ is_primary: false })
      .eq('case_id', input.case_id)
      .eq('org_id', selectedOrgId)
      .eq('is_primary', true)
  }

  const { data, error } = await supabase
    .from('case_risk_items')
    .insert({
      org_id: selectedOrgId,
      case_id: input.case_id,
      is_primary: input.is_primary || false,
      risk_type: input.risk_type,
      cover_type: input.cover_type || null,
      description: input.description || null,
      asset_data: input.asset_data || {},
    })
    .select()
    .single()

  if (error) throw error

  // If primary, update case
  if (data.is_primary) {
    await supabase
      .from('cases')
      .update({ primary_risk_item_id: data.id })
      .eq('id', input.case_id)
      .eq('org_id', selectedOrgId)
  }

  // Audit log
  if (user) {
    await supabase.from('audit_log').insert({
      org_id: selectedOrgId,
      actor_user_id: user.id,
      case_id: input.case_id,
      action: 'RISK_ITEM_ADDED',
      details: { risk_item_id: data.id, risk_type: data.risk_type, is_primary: data.is_primary },
    })
  }

  return data
}

export async function updateRiskItem(
  riskItemId: string,
  updates: UpdateRiskItemInput & { case_id: string }
): Promise<CaseRiskItem> {
  const selectedOrgId = useOrgStore.getState().selectedOrgId
  if (!selectedOrgId) throw new Error('No org selected')

  // If setting as primary, unset existing primary
  if (updates.is_primary) {
    await supabase
      .from('case_risk_items')
      .update({ is_primary: false })
      .eq('case_id', updates.case_id)
      .eq('org_id', selectedOrgId)
      .eq('is_primary', true)
  }

  const { case_id, ...dbUpdates } = updates

  const { data, error } = await supabase
    .from('case_risk_items')
    .update(dbUpdates)
    .eq('id', riskItemId)
    .eq('org_id', selectedOrgId)
    .select()
    .single()

  if (error) throw error

  // If set as primary, update case
  if (data.is_primary) {
    await supabase
      .from('cases')
      .update({ primary_risk_item_id: data.id })
      .eq('id', case_id)
      .eq('org_id', selectedOrgId)
  }

  return data
}

export async function deleteRiskItem(riskItemId: string, caseId: string): Promise<void> {
  const selectedOrgId = useOrgStore.getState().selectedOrgId
  const user = useAuthStore.getState().user
  if (!selectedOrgId) throw new Error('No org selected')

  // Check if primary
  const { data: item } = await supabase
    .from('case_risk_items')
    .select('is_primary')
    .eq('id', riskItemId)
    .single()

  const { error } = await supabase
    .from('case_risk_items')
    .delete()
    .eq('id', riskItemId)
    .eq('org_id', selectedOrgId)

  if (error) throw error

  // If deleted was primary, clear case
  if (item?.is_primary) {
    await supabase
      .from('cases')
      .update({ primary_risk_item_id: null })
      .eq('id', caseId)
      .eq('org_id', selectedOrgId)
  }

  // Audit log
  if (user) {
    await supabase.from('audit_log').insert({
      org_id: selectedOrgId,
      actor_user_id: user.id,
      case_id: caseId,
      action: 'RISK_ITEM_REMOVED',
      details: { risk_item_id: riskItemId },
    })
  }
}
