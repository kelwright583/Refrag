/**
 * Password reset API route handler (admin)
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

    // Note: Password reset requires admin API access
    // For MVP, we'll log the action
    // In production, use Supabase Admin API: supabase.auth.admin.generateLink()

    // Log admin audit event
    await supabase.from('admin_audit_log').insert({
      staff_user_id: staffId,
      action: 'PASSWORD_RESET_TRIGGERED',
      target_type: 'user',
      target_id: params.userId,
      details: {
        triggered_by: user?.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset logged (requires admin API for actual reset)',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
