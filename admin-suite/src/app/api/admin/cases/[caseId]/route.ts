/**
 * Case detail API route handler (admin)
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
 * GET /api/admin/cases/[caseId] - Get case (admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const supabase = await createClient()
    const staffId = await verifyStaff(supabase)

    const { data: caseData, error } = await supabase
      .from('cases')
      .select(`
        *,
        org:organisations(name, slug)
      `)
      .eq('id', params.caseId)
      .single()

    if (error) throw error

    // Log data access
    await supabase.from('data_access_log').insert({
      staff_user_id: staffId,
      org_id: caseData.org_id,
      resource: 'case',
      resource_id: params.caseId,
      reason: 'Case detail view',
    })

    return NextResponse.json(caseData)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
