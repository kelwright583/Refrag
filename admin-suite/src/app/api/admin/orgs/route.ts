/**
 * Organisations API route handler (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateOrganisationInput } from '@/lib/types/admin'
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
 * GET /api/admin/orgs - Get all organisations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    await verifyStaff(supabase)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = supabase
      .from('organisations')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    const { data: orgs, error } = await query

    if (error) throw error

    // Get stats for each org
    const orgsWithStats = await Promise.all(
      (orgs || []).map(async (org) => {
        const [members, cases] = await Promise.all([
          supabase
            .from('org_members')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', org.id),
          supabase
            .from('cases')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', org.id),
        ])

        return {
          ...org,
          member_count: members.count || 0,
          case_count: cases.count || 0,
        }
      })
    )

    return NextResponse.json(orgsWithStats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
