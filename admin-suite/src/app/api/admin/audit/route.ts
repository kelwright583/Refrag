/**
 * Audit log API route handler (admin)
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
 * GET /api/admin/audit - Get audit logs
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    await verifyStaff(supabase)

    const { searchParams } = new URL(request.url)
    const logType = searchParams.get('type') || 'admin' // 'admin' or 'data_access'
    const limit = parseInt(searchParams.get('limit') || '100')

    if (logType === 'admin') {
      const { data: logs, error } = await supabase
        .from('admin_audit_log')
        .select(`
          *,
          staff:staff_users!staff_user_id(user_id, role)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return NextResponse.json(logs || [])
    } else {
      // data_access_log
      const { data: logs, error } = await supabase
        .from('data_access_log')
        .select(`
          *,
          staff:staff_users!staff_user_id(user_id, role),
          org:organisations(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return NextResponse.json(logs || [])
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
