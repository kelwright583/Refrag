import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { z } from 'zod'

const requirementSchema = z.object({
  key: z.string().min(1).optional(),
  label: z.string().min(1),
  description: z.string().optional().nullable(),
  required: z.boolean().optional(),
  evidence_type: z.enum(['photo','video','document','text_note','none']).optional(),
  order_index: z.number().int().min(0).optional(),
})

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

    const raw = await request.json()
    const parseResult = requirementSchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data
    const { label, key: requirement_key, description: category, required: is_required, evidence_type, order_index } = body
    const guidance_note = (raw as any).guidance_note

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

    const raw = await request.json()
    const putParseResult = requirementSchema.partial().passthrough().array().safeParse((raw as any).requirements)
    if (!Array.isArray((raw as any).requirements)) {
      return NextResponse.json({ error: 'Invalid request body', details: { fieldErrors: { requirements: ['Must be an array'] }, formErrors: [] } }, { status: 400 })
    }
    const body = raw as any
    const { requirements } = body

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
