/**
 * PATCH: update appointment (reschedule, edit notes/address, mark complete)
 * DELETE: remove appointment
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (error || !orgMember) throw new Error('No organisation')
  return { orgId: orgMember.org_id, userId: user.id }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { orgId, userId } = await getAuth(supabase)
    const body = await request.json()

    // Only allow updating safe fields
    const updates: Record<string, any> = {}
    if (body.scheduled_at !== undefined) updates.scheduled_at = new Date(body.scheduled_at).toISOString()
    if (body.address !== undefined) updates.address = body.address || null
    if (body.notes !== undefined) updates.notes = body.notes || null
    if (body.completed_at !== undefined) {
      updates.completed_at = body.completed_at ? new Date(body.completed_at).toISOString() : null
    }
    if (body.started_at !== undefined) {
      updates.started_at = body.started_at ? new Date(body.started_at).toISOString() : null
    }

    updates.updated_at = new Date().toISOString()

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

    // Audit log (fire and forget)
    supabase.from('audit_log').insert({
      org_id: orgId,
      user_id: userId,
      action: 'appointment.updated',
      entity_type: 'appointment',
      entity_id: id,
      meta: { fields_updated: Object.keys(updates).filter(k => k !== 'updated_at') },
    }).then(() => {})

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
    const { id } = await params
    const supabase = await createClient()
    const { orgId, userId } = await getAuth(supabase)

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    // Audit log (fire and forget)
    supabase.from('audit_log').insert({
      org_id: orgId,
      user_id: userId,
      action: 'appointment.deleted',
      entity_type: 'appointment',
      entity_id: id,
    }).then(() => {})

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
