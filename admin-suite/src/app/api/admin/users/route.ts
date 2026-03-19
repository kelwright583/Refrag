/**
 * Users API route handler (admin)
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
 * GET /api/admin/users - Get all users
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    await verifyStaff(supabase)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // Get users from auth.users via org_members
    const { data: orgMembers, error: membersError } = await supabase
      .from('org_members')
      .select('user_id')
      .order('created_at', { ascending: false })

    if (membersError) throw membersError

    const userIds = [...new Set((orgMembers || []).map((m: any) => m.user_id))]

    // For each user, get their email and org memberships
    const usersWithOrgs = await Promise.all(
      userIds.map(async (userId) => {
        // Get user email (we'll need to fetch from auth.users via a function or store it)
        // For now, we'll get it from org_members join
        const { data: memberships } = await supabase
          .from('org_members')
          .select('org_id, role, org:organisations(name)')
          .eq('user_id', userId)

        // Get user email from auth - we'll need to use admin API or store it
        // For MVP, we can get it from the first org member record if we store it
        // Or use Supabase admin API
        return {
          id: userId,
          email: 'user@example.com', // Placeholder - would need admin API access
          orgs: (memberships || []).map((m: any) => ({
            id: m.org_id,
            name: m.org?.name || 'Unknown',
            role: m.role,
          })),
        }
      })
    )

    // Filter by search if provided
    let filtered = usersWithOrgs
    if (search) {
      filtered = usersWithOrgs.filter((u) =>
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    }

    return NextResponse.json(filtered)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
