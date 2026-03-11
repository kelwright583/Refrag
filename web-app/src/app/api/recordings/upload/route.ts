/**
 * POST: upload recording file to storage and create recordings row.
 * FormData: file, case_id, recording_type, duration_seconds (optional), consent_recorded (optional).
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const orgId = await getUserOrgId(supabase)

    const formData = await request.formData()
    const file = formData.get('file') as File
    const caseId = formData.get('case_id') as string
    const recordingType = (formData.get('recording_type') as string) || 'other'
    const durationSeconds = formData.get('duration_seconds') ? parseInt(formData.get('duration_seconds') as string, 10) : null
    const consentRecorded = formData.get('consent_recorded') === 'true' || formData.get('consent_recorded') === '1'

    if (!file || !caseId) return NextResponse.json({ error: 'file and case_id required' }, { status: 400 })

    const ext = file.name.split('.').pop() || 'bin'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const storagePath = `recordings/${orgId}/${caseId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(storagePath, file, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError

    const { data: row, error: insertError } = await supabase
      .from('recordings')
      .insert({
        org_id: orgId,
        case_id: caseId,
        created_by: user.id,
        recording_type: recordingType,
        storage_path: storagePath,
        duration_seconds: durationSeconds,
        consent_recorded: consentRecorded,
      })
      .select()
      .single()
    if (insertError) throw insertError
    return NextResponse.json(row)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
