/**
 * User API route handler (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateUserInput } from '@/lib/types/admin'

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
 * GET /api/admin/users/[userId] - Get user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    await verifyStaff(supabase)

    // Get user org memberships
    const { data: memberships, error } = await supabase
      .from('org_members')
      .select('org_id, role, org:organisations(name)')
      .eq('user_id', params.userId)

    if (error) throw error

    return NextResponse.json({
      id: params.userId,
      email: 'user@example.com', // Placeholder - would need admin API
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

    // Note: Disabling users would require admin API access to auth.users
    // For MVP, we can track this in a separate table or use Supabase admin API
    // For now, we'll just log the action

    // Log admin audit event
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

    return NextResponse.json({ success: true, message: 'User update logged' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
