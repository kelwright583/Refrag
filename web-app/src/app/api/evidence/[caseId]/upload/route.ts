/**
 * Evidence upload API route handler
 * Handles file upload to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackServerEvent } from '@/lib/events'

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
 * POST /api/evidence/[caseId]/upload - Upload file to Supabase Storage
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const formData = await request.formData()
    const file = formData.get('file') as File
    const mediaType = formData.get('media_type') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Generate storage path: org/{org_id}/case/{case_id}/{uuid}-{filename}
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `org/${orgId}/case/${caseId}/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    trackServerEvent('evidence_uploaded', {
      case_id: caseId,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type,
      media_type: mediaType,
    }, { orgId })

    return NextResponse.json({
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type,
      media_type: mediaType,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
