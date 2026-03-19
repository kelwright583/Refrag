import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    const { mandateId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json().catch(() => ({}))
    const targetClientId = body.target_client_id || null

    const { data: source, error: srcErr } = await supabase
      .from('mandates')
      .select('*')
      .eq('id', mandateId)
      .eq('org_id', orgId)
      .single()

    if (srcErr) throw srcErr
    if (!source) return serverError('Source mandate not found', 404)

    const { data: newMandate, error: createErr } = await supabase
      .from('mandates')
      .insert({
        org_id: orgId,
        name: `${source.name} (copy)`,
        description: source.description,
        client_id: targetClientId ?? source.client_id,
        vertical: source.vertical,
        is_default: false,
        is_active: true,
      })
      .select()
      .single()

    if (createErr) throw createErr

    const { data: sourceReqs, error: reqErr } = await supabase
      .from('mandate_requirements')
      .select('*')
      .eq('mandate_id', mandateId)
      .eq('org_id', orgId)
      .order('order_index', { ascending: true })

    if (reqErr) throw reqErr

    if (sourceReqs && sourceReqs.length > 0) {
      const cloned = sourceReqs.map((r: any) => ({
        org_id: orgId,
        mandate_id: newMandate.id,
        requirement_key: r.requirement_key || r.key,
        key: r.requirement_key || r.key,
        label: r.label,
        description: r.description,
        required: r.required ?? r.is_required ?? false,
        is_required: r.is_required ?? r.required ?? false,
        evidence_type: r.evidence_type || 'none',
        guidance_note: r.guidance_note || null,
        order_index: r.order_index,
      }))

      const { error: insertErr } = await supabase
        .from('mandate_requirements')
        .insert(cloned)

      if (insertErr) throw insertErr
    }

    return NextResponse.json(newMandate, { status: 201 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
