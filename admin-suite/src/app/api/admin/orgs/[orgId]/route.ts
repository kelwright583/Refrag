/**
 * Organisation API route handler (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateOrganisationInput } from '@/lib/types/admin'

async function verifyStaff(supabase: any): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: staff, error } = await supabase
    .from('staff_users')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (error || !staff) {
    throw new Error('Not authorized - staff access required')
  }

  return staff.id
}

/**
 * GET /api/admin/orgs/[orgId] - Get organisation by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const supabase = await createClient()
    await verifyStaff(supabase)

    const { data: org, error } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', params.orgId)
      .single()

    if (error) throw error

    // Get stats
    const [members, cases, evidence] = await Promise.all([
      supabase
        .from('org_members')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', params.orgId),
      supabase
        .from('cases')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', params.orgId),
      supabase
        .from('evidence')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', params.orgId),
    ])

    return NextResponse.json({
      ...org,
      member_count: members.count || 0,
      case_count: cases.count || 0,
      evidence_count: evidence.count || 0,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/orgs/[orgId] - Update organisation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const supabase = await createClient()
    const staffId = await verifyStaff(supabase)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const updates: UpdateOrganisationInput = await request.json()

    const { data: org, error } = await supabase
      .from('organisations')
      .update(updates)
      .eq('id', params.orgId)
      .select()
      .single()

    if (error) throw error

    // Log admin audit event
    await supabase.from('admin_audit_log').insert({
      staff_user_id: staffId,
      action: 'ORG_UPDATED',
      target_type: 'org',
      target_id: params.orgId,
      details: {
        updates,
        updated_by: user?.id,
      },
    })

    return NextResponse.json(org)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
