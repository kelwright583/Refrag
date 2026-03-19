/**
 * Organisation members API route handler (admin)
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
 * GET /api/admin/orgs/[orgId]/members - Get organisation members
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const supabase = await createClient()
    await verifyStaff(supabase)

    const { data: members, error } = await supabase
      .from('org_members')
      .select(`
        *,
        user:auth.users!user_id(id, email)
      `)
      .eq('org_id', params.orgId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data
    const result = (members || []).map((item: any) => ({
      ...item,
      user: item.user
        ? {
            id: item.user.id,
            email: item.user.email,
          }
        : undefined,
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
