import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; rateId: string }> }
) {
  try {
    const { clientId, rateId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.rate_type !== undefined) updateData.rate_type = body.rate_type
    if (body.amount !== undefined) updateData.amount = Number(body.amount)
    if (body.currency_code !== undefined) updateData.currency_code = body.currency_code
    if (body.unit_label !== undefined) updateData.unit_label = body.unit_label || null
    if (body.applies_to !== undefined) updateData.applies_to = body.applies_to || null
    if (body.notes !== undefined) updateData.notes = body.notes || null
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { data, error: dbErr } = await supabase
      .from('client_rate_structures')
      .update(updateData)
      .eq('id', rateId)
      .eq('client_id', clientId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (dbErr) throw dbErr
    if (!data) return serverError('Rate not found', 404)
    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string; rateId: string }> }
) {
  try {
    const { clientId, rateId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { error: dbErr } = await supabase
      .from('client_rate_structures')
      .delete()
      .eq('id', rateId)
      .eq('client_id', clientId)
      .eq('org_id', orgId)

    if (dbErr) throw dbErr
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return serverError(err.message)
  }
}
