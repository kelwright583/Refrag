/**
 * Exports API route handler (admin)
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
 * GET /api/admin/exports - Get all exports
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const staffId = await verifyStaff(supabase)

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('org_id')

    let query = supabase
      .from('exports')
      .select(`
        *,
        case:cases(case_number, client_name),
        report:reports(title, version),
        org:organisations(name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (orgId) {
      query = query.eq('org_id', orgId)
    }

    const { data: exports, error } = await query

    if (error) throw error

    // Log data access
    await supabase.from('data_access_log').insert({
      staff_user_id: staffId,
      org_id: orgId || null,
      resource: 'exports',
      reason: 'Exports list view',
    })

    return NextResponse.json(exports || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
