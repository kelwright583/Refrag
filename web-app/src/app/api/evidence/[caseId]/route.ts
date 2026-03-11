/**
 * Evidence API route handler
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
 * GET /api/evidence/[caseId] - Get evidence for a case
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    // Get evidence with pagination
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: evidence, error: evidenceError } = await supabase
      .from('evidence')
      .select('*')
      .eq('case_id', caseId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (evidenceError) throw evidenceError

    // Get tags for each evidence item
    const evidenceWithTags = await Promise.all(
      (evidence || []).map(async (item: any) => {
        const { data: tags } = await supabase
          .from('evidence_tags')
          .select('tag')
          .eq('evidence_id', item.id)

        return {
          ...item,
          tags: tags?.map((t: any) => t.tag) || [],
        }
      })
    )

    return NextResponse.json(evidenceWithTags)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/evidence/[caseId] - Create evidence (after file upload)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase)
    const body = await request.json()

    // Create evidence record
    const { data: evidence, error: evidenceError } = await supabase
      .from('evidence')
      .insert({
        org_id: orgId,
        case_id: caseId,
        uploaded_by: user.id,
        storage_path: body.storage_path,
        media_type: body.media_type,
        content_type: body.content_type,
        file_name: body.file_name,
        file_size: body.file_size,
        captured_at: body.captured_at || null,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (evidenceError) throw evidenceError

    // Add tags if provided
    if (body.tags && body.tags.length > 0) {
      const tagInserts = body.tags.map((tag: string) => ({
        org_id: orgId,
        case_id: caseId,
        evidence_id: evidence.id,
        tag,
      }))

      await supabase.from('evidence_tags').insert(tagInserts)
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: caseId,
      action: 'EVIDENCE_CREATED',
      details: { evidence_id: evidence.id, file_name: body.file_name },
    })

    return NextResponse.json({ ...evidence, tags: body.tags || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
