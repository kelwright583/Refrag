import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'

export async function GET() {
  try {
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data: mandates, error: dbErr } = await supabase
      .from('mandates')
      .select(`
        *,
        clients!mandates_client_id_fkey ( name )
      `)
      .eq('org_id', orgId)
      .order('name', { ascending: true })

    if (dbErr) throw dbErr

    const { data: counts, error: countErr } = await supabase
      .from('mandate_requirements')
      .select('mandate_id')
      .eq('org_id', orgId)

    if (countErr) throw countErr

    const countMap: Record<string, number> = {}
    for (const row of counts || []) {
      countMap[row.mandate_id] = (countMap[row.mandate_id] || 0) + 1
    }

    const result = (mandates || []).map((m: any) => ({
      ...m,
      client_name: m.clients?.name || null,
      clients: undefined,
      requirement_count: countMap[m.id] || 0,
    }))

    return NextResponse.json(result)
  } catch (err: any) {
    return serverError(err.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const { name, description, client_id, vertical, is_default, clone_from_id } = body

    if (!name) {
      return serverError('name is required', 400)
    }

    const { data, error: dbErr } = await supabase
      .from('mandates')
      .insert({
        org_id: orgId,
        name,
        description: description || null,
        client_id: client_id || null,
        vertical: vertical || 'all',
        is_default: is_default ?? false,
        is_active: true,
      })
      .select()
      .single()

    if (dbErr) throw dbErr

    if (clone_from_id) {
      const { data: sourceReqs, error: srcErr } = await supabase
        .from('mandate_requirements')
        .select('*')
        .eq('mandate_id', clone_from_id)
        .eq('org_id', orgId)
        .order('order_index', { ascending: true })

      if (srcErr) throw srcErr

      if (sourceReqs && sourceReqs.length > 0) {
        const cloned = sourceReqs.map((r: any) => ({
          org_id: orgId,
          mandate_id: data.id,
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
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
