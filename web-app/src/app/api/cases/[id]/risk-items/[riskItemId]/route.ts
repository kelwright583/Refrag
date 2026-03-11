/**
 * Case Risk Item API - update and delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getUserOrgId(supabase: any): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (error || !orgMember) throw new Error('No organization found for user')
  return orgMember.org_id
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; riskItemId: string }> }
) {
  try {
    const { id: caseId, riskItemId } = await params
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const body = await request.json()

    // If setting as primary, unset existing primary
    if (body.is_primary) {
      await supabase
        .from('case_risk_items')
        .update({ is_primary: false })
        .eq('case_id', caseId)
        .eq('org_id', orgId)
        .eq('is_primary', true)
    }

    const updates: Record<string, unknown> = {}
    if (body.risk_type !== undefined) updates.risk_type = body.risk_type
    if (body.cover_type !== undefined) updates.cover_type = body.cover_type
    if (body.description !== undefined) updates.description = body.description
    if (body.asset_data !== undefined) updates.asset_data = body.asset_data
    if (body.is_primary !== undefined) updates.is_primary = body.is_primary

    const { data, error } = await supabase
      .from('case_risk_items')
      .update(updates)
      .eq('id', riskItemId)
      .eq('case_id', caseId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error

    // If set as primary, update case
    if (data.is_primary) {
      await supabase
        .from('cases')
        .update({ primary_risk_item_id: data.id })
        .eq('id', caseId)
        .eq('org_id', orgId)
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; riskItemId: string }> }
) {
  try {
    const { id: caseId, riskItemId } = await params
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    // Check if this is the primary risk item
    const { data: item } = await supabase
      .from('case_risk_items')
      .select('is_primary')
      .eq('id', riskItemId)
      .eq('org_id', orgId)
      .single()

    const { error } = await supabase
      .from('case_risk_items')
      .delete()
      .eq('id', riskItemId)
      .eq('case_id', caseId)
      .eq('org_id', orgId)

    if (error) throw error

    // If deleted was primary, clear case.primary_risk_item_id
    if (item?.is_primary) {
      await supabase
        .from('cases')
        .update({ primary_risk_item_id: null })
        .eq('id', caseId)
        .eq('org_id', orgId)
    }

    // Audit log
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('audit_log').insert({
        org_id: orgId,
        actor_user_id: user.id,
        case_id: caseId,
        action: 'RISK_ITEM_REMOVED',
        details: { risk_item_id: riskItemId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
