import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ mandateId: string; requirementId: string }> }
) {
  try {
    const { mandateId, requirementId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.label !== undefined) updateData.label = body.label
    if (body.requirement_key !== undefined) {
      updateData.requirement_key = body.requirement_key
      updateData.key = body.requirement_key
    }
    if (body.category !== undefined) updateData.description = body.category
    if (body.is_required !== undefined) {
      updateData.is_required = body.is_required
      updateData.required = body.is_required
    }
    if (body.evidence_type !== undefined) updateData.evidence_type = body.evidence_type
    if (body.guidance_note !== undefined) updateData.guidance_note = body.guidance_note || null
    if (body.order_index !== undefined) updateData.order_index = body.order_index

    const { data, error: dbErr } = await supabase
      .from('mandate_requirements')
      .update(updateData)
      .eq('id', requirementId)
      .eq('mandate_id', mandateId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (dbErr) throw dbErr
    if (!data) return serverError('Requirement not found', 404)
    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ mandateId: string; requirementId: string }> }
) {
  try {
    const { mandateId, requirementId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { error: dbErr } = await supabase
      .from('mandate_requirements')
      .delete()
      .eq('id', requirementId)
      .eq('mandate_id', mandateId)
      .eq('org_id', orgId)

    if (dbErr) throw dbErr
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return serverError(err.message)
  }
}
