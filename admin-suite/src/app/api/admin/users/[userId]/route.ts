/**
 * User API route handler (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UpdateUserInput } from '@/lib/types/admin'
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
 * GET /api/admin/users/[userId] - Get user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    await verifyStaff(supabase)

    const adminClient = createAdminClient()
    const { data: { user: targetUser }, error: userError } = await adminClient.auth.admin.getUserById(params.userId)
    if (userError) throw userError

    const { data: memberships, error } = await supabase
      .from('org_members')
      .select('org_id, role, org:organisations(name)')
      .eq('user_id', params.userId)

    if (error) throw error

    return NextResponse.json({
      id: params.userId,
      email: targetUser?.email ?? 'unknown',
      created_at: targetUser?.created_at,
      orgs: (memberships || []).map((m: any) => ({
        id: m.org_id,
        name: m.org?.name || 'Unknown',
        role: m.role,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/users/[userId] - Update user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const staffId = await verifyStaff(supabase)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const updates: UpdateUserInput = await request.json()

    if (updates.disabled !== undefined) {
      const adminClient = createAdminClient()
      const { error: updateError } = await adminClient.auth.admin.updateUserById(params.userId, {
        ban_duration: updates.disabled ? '876000h' : 'none',
      })
      if (updateError) throw updateError
    }

    await supabase.from('admin_audit_log').insert({
      staff_user_id: staffId,
      action: 'USER_UPDATED',
      target_type: 'user',
      target_id: params.userId,
      details: {
        updates,
        updated_by: user?.id,
      },
    })

    return NextResponse.json({ success: true, message: 'User updated' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
