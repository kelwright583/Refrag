/**
 * Evidence API route handler (single evidence)
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
 * PATCH /api/evidence/[caseId]/[evidenceId] - Update evidence
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; evidenceId: string }> }
) {
  try {
    const { caseId, evidenceId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase)
    const body = await request.json()

    // Update evidence
    const updateData: any = {}
    if (body.notes !== undefined) updateData.notes = body.notes

    const { data: evidence, error: evidenceError } = await supabase
      .from('evidence')
      .update(updateData)
      .eq('id', evidenceId)
      .eq('case_id', caseId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (evidenceError) throw evidenceError

    // Update tags if provided
    if (body.tags !== undefined) {
      // Delete existing tags
      await supabase.from('evidence_tags').delete().eq('evidence_id', evidenceId)

      // Insert new tags
      if (body.tags.length > 0) {
        const tagInserts = body.tags.map((tag: string) => ({
          org_id: orgId,
          case_id: caseId,
          evidence_id: evidenceId,
          tag,
        }))

        await supabase.from('evidence_tags').insert(tagInserts)
      }
    }

    // Get updated tags
    const { data: tags } = await supabase
      .from('evidence_tags')
      .select('tag')
      .eq('evidence_id', evidenceId)

    return NextResponse.json({
      ...evidence,
          tags: tags?.map((t: any) => t.tag) || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/evidence/[caseId]/[evidenceId] - Delete evidence
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string; evidenceId: string }> }
) {
  try {
    const { caseId, evidenceId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase)

    // Get evidence to get storage path
    const { data: evidence, error: evidenceError } = await supabase
      .from('evidence')
      .select('storage_path')
      .eq('id', evidenceId)
      .eq('case_id', caseId)
      .eq('org_id', orgId)
      .single()

    if (evidenceError) throw evidenceError

    // Delete from storage
    await supabase.storage.from('evidence').remove([evidence.storage_path])

    // Delete tags
    await supabase.from('evidence_tags').delete().eq('evidence_id', evidenceId)

    // Delete evidence record
    const { error: deleteError } = await supabase
      .from('evidence')
      .delete()
      .eq('id', evidenceId)
      .eq('case_id', caseId)
      .eq('org_id', orgId)

    if (deleteError) throw deleteError

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: caseId,
      action: 'EVIDENCE_DELETED',
      details: { evidence_id: evidenceId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
