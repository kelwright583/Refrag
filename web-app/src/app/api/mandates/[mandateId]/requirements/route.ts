import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    const { mandateId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data, error: dbErr } = await supabase
      .from('mandate_requirements')
      .select('*')
      .eq('mandate_id', mandateId)
      .eq('org_id', orgId)
      .order('order_index', { ascending: true })

    if (dbErr) throw dbErr
    return NextResponse.json(data || [])
  } catch (err: any) {
    return serverError(err.message)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    const { mandateId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const { label, requirement_key, category, is_required, evidence_type, guidance_note, order_index } = body

    if (!label) {
      return serverError('label is required', 400)
    }

    const key = requirement_key || label.toLowerCase().replace(/[^a-z0-9]+/g, '_')

    const { data, error: dbErr } = await supabase
      .from('mandate_requirements')
      .insert({
        org_id: orgId,
        mandate_id: mandateId,
        requirement_key: key,
        key,
        label,
        description: category || 'custom',
        required: is_required ?? true,
        is_required: is_required ?? true,
        evidence_type: evidence_type || 'none',
        guidance_note: guidance_note || null,
        order_index: order_index ?? 0,
      })
      .select()
      .single()

    if (dbErr) throw dbErr
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return serverError(err.message)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    const { mandateId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const { requirements } = body

    if (!Array.isArray(requirements)) {
      return serverError('requirements array is required', 400)
    }

    const results = []
    for (const req of requirements) {
      const updateData: Record<string, unknown> = {
        order_index: req.order_index,
      }
      if (req.category !== undefined) {
        updateData.description = req.category
      }

      const { data, error: dbErr } = await supabase
        .from('mandate_requirements')
        .update(updateData)
        .eq('id', req.id)
        .eq('mandate_id', mandateId)
        .eq('org_id', orgId)
        .select()
        .single()

      if (dbErr) throw dbErr
      if (data) results.push(data)
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return serverError(err.message)
  }
}
