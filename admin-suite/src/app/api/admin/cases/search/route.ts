/**
 * Case search API route handler (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

async function verifyStaff(supabase: SupabaseClient): Promise<string> {
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
 * GET /api/admin/cases/search - Search cases (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const staffId = await verifyStaff(supabase)

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    if (!query) {
      return NextResponse.json([])
    }

    // Search cases across all orgs (staff can access all)
    const { data: cases, error } = await supabase
      .from('cases')
      .select(`
        id,
        org_id,
        case_number,
        client_name,
        status,
        created_at,
        org:organisations(name)
      `)
      .or(
        `case_number.ilike.%${query}%,client_name.ilike.%${query}%,claim_reference.ilike.%${query}%`
      )
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    // Log data access
    await supabase.from('data_access_log').insert({
      staff_user_id: staffId,
      resource: 'cases',
      reason: `Case search: ${query}`,
    })

    return NextResponse.json(cases || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
