/**
 * GET one recording, PATCH update, DELETE (and optionally remove file from storage).
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
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const { id } = await params
    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.recording_type !== undefined) updates.recording_type = body.recording_type
    if (body.duration_seconds !== undefined) updates.duration_seconds = body.duration_seconds
    if (body.transcript_text !== undefined) updates.transcript_text = body.transcript_text
    if (body.consent_recorded !== undefined) updates.consent_recorded = body.consent_recorded

    const { data, error } = await supabase
      .from('recordings')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const { id } = await params
    const { data: rec, error: fetchError } = await supabase
      .from('recordings')
      .select('storage_path')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()
    if (fetchError || !rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await supabase.storage.from('evidence').remove([rec.storage_path])
    const { error: delError } = await supabase.from('recordings').delete().eq('id', id).eq('org_id', orgId)
    if (delError) throw delError
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
