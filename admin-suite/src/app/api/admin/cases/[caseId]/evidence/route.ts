/**
 * Case evidence API route handler (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifyStaff(supabase: any): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: staff, error } = await supabase
    .from('staff_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (error || !staff) {
    throw new Error('Not authorized - staff access required')
  }

  return staff.id
}

/**
 * GET /api/admin/cases/[caseId]/evidence - Get case evidence (admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const supabase = await createClient()
    const staffId = await verifyStaff(supabase)

    // Get case to verify org_id
    const { data: caseData } = await supabase
      .from('cases')
      .select('org_id')
      .eq('id', params.caseId)
      .single()

    const { data: evidence, error } = await supabase
      .from('evidence')
      .select('*, tags:evidence_tags(tag)')
      .eq('case_id', params.caseId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Log data access
    await supabase.from('data_access_log').insert({
      staff_user_id: staffId,
      org_id: caseData?.org_id,
      resource: 'evidence',
      resource_id: params.caseId,
      reason: 'Evidence list view',
    })

    return NextResponse.json(evidence || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
