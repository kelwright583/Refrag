/**
 * Evidence signed URL API route handler (admin)
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
 * GET /api/admin/cases/[caseId]/evidence/[evidenceId]/signed-url - Get signed URL (admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string; evidenceId: string } }
) {
  try {
    const supabase = await createClient()
    const staffId = await verifyStaff(supabase)

    // Get evidence
    const { data: evidence, error: evidenceError } = await supabase
      .from('evidence')
      .select('storage_path, org_id')
      .eq('id', params.evidenceId)
      .eq('case_id', params.caseId)
      .single()

    if (evidenceError || !evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 })
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('evidence')
      .createSignedUrl(evidence.storage_path, 3600)

    if (urlError) throw urlError

    // Log data access
    await supabase.from('data_access_log').insert({
      staff_user_id: staffId,
      org_id: evidence.org_id,
      resource: 'evidence',
      resource_id: params.evidenceId,
      reason: 'Evidence file access',
    })

    return NextResponse.json({ url: signedUrlData.signedUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
