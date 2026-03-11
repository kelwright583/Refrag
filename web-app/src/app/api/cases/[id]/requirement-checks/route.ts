/**
 * Requirement checks API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateRequirementCheckInput } from '@/lib/types/mandate'

async function getUserOrgId(supabase: any): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (error || !orgMember) {
    throw new Error('No organization found for user')
  }

  return orgMember.org_id
}

/**
 * GET /api/cases/[caseId]/requirement-checks - Get requirement checks for a case
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('requirement_checks')
      .select(`
        *,
        requirement:mandate_requirements(*),
        evidence:evidence(id, file_name, media_type)
      `)
      .eq('case_id', params.id)
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })

    if (error) throw error

    const result = (data || []).map((item: any) => ({
      ...item,
      requirement: item.requirement,
      evidence: item.evidence
        ? {
            id: item.evidence.id,
            file_name: item.evidence.file_name,
            media_type: item.evidence.media_type,
          }
        : null,
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/cases/[caseId]/requirement-checks - Update requirement check
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase)
    const updates: UpdateRequirementCheckInput = await request.json()

    const updateData: any = {}
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.evidence_id !== undefined) updateData.evidence_id = updates.evidence_id
    if (updates.note !== undefined) updateData.note = updates.note

    const { error } = await supabase
      .from('requirement_checks')
      .update(updateData)
      .eq('id', updates.requirement_check_id)
      .eq('case_id', params.id)
      .eq('org_id', orgId)

    if (error) throw error

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: params.id,
      action: 'REQUIREMENT_CHECK_UPDATED',
      details: {
        requirement_check_id: updates.requirement_check_id,
        ...updateData,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
