/**
 * Password reset API route handler (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
 * POST /api/admin/users/[userId]/reset-password - Trigger password reset
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const staffId = await verifyStaff(supabase)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const adminClient = createAdminClient()

    const { data: { user: targetUser }, error: userError } = await adminClient.auth.admin.getUserById(params.userId)
    if (userError || !targetUser?.email) {
      throw new Error('Could not find user email')
    }

    const { error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: targetUser.email,
    })
    if (linkError) throw linkError

    await supabase.from('admin_audit_log').insert({
      staff_user_id: staffId,
      action: 'PASSWORD_RESET_TRIGGERED',
      target_type: 'user',
      target_id: params.userId,
      details: {
        triggered_by: user?.id,
        target_email: targetUser.email,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset link generated successfully',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
