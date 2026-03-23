import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { z } from 'zod'

const updateMandateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  vertical: z.string().optional().nullable(),
  is_default: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    const { mandateId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data: mandate, error: dbErr } = await supabase
      .from('mandates')
      .select(`
        *,
        clients!mandates_client_id_fkey ( name )
      `)
      .eq('id', mandateId)
      .eq('org_id', orgId)
      .single()

    if (dbErr) throw dbErr
    if (!mandate) return serverError('Mandate not found', 404)

    const { data: requirements, error: reqErr } = await supabase
      .from('mandate_requirements')
      .select('*')
      .eq('mandate_id', mandateId)
      .eq('org_id', orgId)
      .order('order_index', { ascending: true })

    if (reqErr) throw reqErr

    return NextResponse.json({
      ...mandate,
      client_name: mandate.clients?.name || null,
      clients: undefined,
      requirements: requirements || [],
    })
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
    const parseResult = updateMandateSchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description || null
    if (body.client_id !== undefined) updateData.client_id = body.client_id || null
    if (body.vertical !== undefined) updateData.vertical = body.vertical
    if (body.is_default !== undefined) updateData.is_default = body.is_default

    const { data, error: dbErr } = await supabase
      .from('mandates')
      .update(updateData)
      .eq('id', mandateId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (dbErr) throw dbErr
    if (!data) return serverError('Mandate not found', 404)
    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    const { mandateId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { error: dbErr } = await supabase
      .from('mandates')
      .delete()
      .eq('id', mandateId)
      .eq('org_id', orgId)

    if (dbErr) throw dbErr
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return serverError(err.message)
  }
}
