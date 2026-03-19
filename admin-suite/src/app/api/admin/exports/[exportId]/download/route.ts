/**
 * Export download API route handler (admin)
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
 * GET /api/admin/exports/[exportId]/download - Get signed URL for export (admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { exportId: string } }
) {
  try {
    const supabase = await createClient()
    const staffId = await verifyStaff(supabase)

    const { data: exportRecord, error: exportError } = await supabase
      .from('exports')
      .select('storage_path, org_id')
      .eq('id', params.exportId)
      .single()

    if (exportError || !exportRecord) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 })
    }

    if (!exportRecord.storage_path) {
      return NextResponse.json({ error: 'PDF not generated yet' }, { status: 400 })
    }

    // Generate signed URL
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('evidence')
      .createSignedUrl(exportRecord.storage_path, 3600)

    if (urlError) throw urlError

    // Log data access
    await supabase.from('data_access_log').insert({
      staff_user_id: staffId,
      org_id: exportRecord.org_id,
      resource: 'export',
      resource_id: params.exportId,
      reason: 'Export download',
    })

    return NextResponse.json({ url: signedUrlData.signedUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
