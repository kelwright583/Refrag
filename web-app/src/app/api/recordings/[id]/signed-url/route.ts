/**
 * GET: signed URL for recording playback/download.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getUserOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organisation')
  return orgMember.org_id
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const { id } = await params
    const { data: rec, error } = await supabase
      .from('recordings')
      .select('storage_path')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()
    if (error || !rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { data: signed, error: urlError } = await supabase.storage
      .from('evidence')
      .createSignedUrl(rec.storage_path, 3600)
    if (urlError) throw urlError
    return NextResponse.json({ url: signed?.signedUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
