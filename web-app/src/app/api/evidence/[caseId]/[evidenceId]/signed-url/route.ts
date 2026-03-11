/**
 * Get signed URL for evidence viewing
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
 * GET /api/evidence/[caseId]/[evidenceId]/signed-url - Get signed URL for evidence
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; evidenceId: string }> }
) {
  try {
    const { caseId, evidenceId } = await params
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    // Verify evidence belongs to case and org
    const { data: evidence, error: evidenceError } = await supabase
      .from('evidence')
      .select('storage_path')
      .eq('id', evidenceId)
      .eq('case_id', caseId)
      .eq('org_id', orgId)
      .single()

    if (evidenceError || !evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 })
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('evidence')
      .createSignedUrl(evidence.storage_path, 3600)

    if (urlError) throw urlError

    return NextResponse.json({ url: signedUrlData.signedUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
