/**
 * Download export PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getUserOrgId(supabase: any): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (error || !orgMember) {
    throw new Error('No organization found for user')
  }

  return orgMember.org_id
}

/**
 * GET /api/exports/[exportId]/download - Get signed URL for export PDF download
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { exportId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    // Get export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('exports')
      .select('storage_path')
      .eq('id', params.exportId)
      .eq('org_id', orgId)
      .single()

    if (exportError || !exportRecord) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 })
    }

    if (!exportRecord.storage_path) {
      return NextResponse.json({ error: 'PDF not generated yet' }, { status: 400 })
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('evidence')
      .createSignedUrl(exportRecord.storage_path, 3600)

    if (urlError) throw urlError

    return NextResponse.json({ url: signedUrlData.signedUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
