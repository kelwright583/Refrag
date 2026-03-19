import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; ruleKey: string }> }
) {
  try {
    const { clientId, ruleKey } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.rule_value !== undefined) updateData.rule_value = body.rule_value
    if (body.label !== undefined) updateData.label = body.label || null
    if (body.vertical !== undefined) updateData.vertical = body.vertical || 'all'
    if (body.description !== undefined) updateData.description = body.description || null

    const { data, error: dbErr } = await supabase
      .from('client_rules')
      .update(updateData)
      .eq('client_id', clientId)
      .eq('rule_key', decodeURIComponent(ruleKey))
      .eq('org_id', orgId)
      .select()
      .single()

    if (dbErr) throw dbErr
    if (!data) return serverError('Rule not found', 404)
    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string; ruleKey: string }> }
) {
  try {
    const { clientId, ruleKey } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { error: dbErr } = await supabase
      .from('client_rules')
      .delete()
      .eq('client_id', clientId)
      .eq('rule_key', decodeURIComponent(ruleKey))
      .eq('org_id', orgId)

    if (dbErr) throw dbErr
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return serverError(err.message)
  }
}
