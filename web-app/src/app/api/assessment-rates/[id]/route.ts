import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getUserOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organisation')
  return orgMember.org_id
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
    if (body.rate_name !== undefined) updates.rate_name = body.rate_name
    if (body.rate_type !== undefined) updates.rate_type = body.rate_type
    if (body.amount !== undefined) updates.amount = Number(body.amount)
    if (body.is_inclusive !== undefined) updates.is_inclusive = body.is_inclusive
    if (body.vat_pct !== undefined) updates.vat_pct = Number(body.vat_pct)
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.notes !== undefined) updates.notes = body.notes || null

    const { data, error } = await supabase
      .from('assessment_rates')
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
    const { error } = await supabase
      .from('assessment_rates')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
